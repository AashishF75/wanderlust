const mongoose = require("mongoose");
const Booking = require("../models/booking");
const Listing = require("../models/list");
const User = require("../models/user");
const Notification = require("../models/notification");
const Coupon = require("../models/coupon");

// Concurrency mutex lock per listing
const listingLocks = new Map();

async function acquireListingLock(listingId) {
    const key = listingId.toString();
    while (listingLocks.has(key)) {
        await listingLocks.get(key);
    }
    let release;
    const promise = new Promise(resolve => { release = resolve; });
    listingLocks.set(key, promise);
    return () => {
        listingLocks.delete(key);
        release();
    };
}

// Server-side price calculation engine
function calculateBookingPricing(pricePerNight, checkInDate, checkOutDate) {
    const msPerDay = 1000 * 60 * 60 * 24;
    const diffTime = checkOutDate.getTime() - checkInDate.getTime();
    const nights = Math.round(diffTime / msPerDay);

    if (nights <= 0) {
        throw new Error("Check-out date must be at least 1 night after check-in date.");
    }

    const basePrice = pricePerNight * nights;
    const cleaningFee = Math.round(pricePerNight * 0.10); // Standard 10% 1-night cleaning fee
    const serviceFee = Math.round(basePrice * 0.05); // 5% Wanderlust service fee
    const tax = Math.round((basePrice + cleaningFee + serviceFee) * 0.18); // 18% GST
    const totalPrice = basePrice + cleaningFee + serviceFee + tax;

    return { nights, basePrice, cleaningFee, serviceFee, tax, totalPrice };
}

// Check availability function (interval overlap condition: existing.checkIn < requested.checkOut AND existing.checkOut > requested.checkIn)
async function checkAvailability(listingId, checkInDate, checkOutDate, excludeBookingId = null, session = null) {
    // 1. Check if dates intersect with any host-blocked maintenance dates (Feature 10)
    const listing = await Listing.findById(listingId);
    if (listing && listing.blockedDates && listing.blockedDates.length > 0) {
        for (const blocked of listing.blockedDates) {
            const bDate = new Date(blocked);
            bDate.setUTCHours(0, 0, 0, 0);
            if (bDate >= checkInDate && bDate < checkOutDate) {
                return false; // Intersects with blocked date
            }
        }
    }

    const query = {
        listing: listingId,
        status: { $in: ["Confirmed", "Pending"] },
        checkIn: { $lt: checkOutDate },
        checkOut: { $gt: checkInDate }
    };

    if (excludeBookingId) {
        query._id = { $ne: excludeBookingId };
    }

    let q = Booking.findOne(query);
    if (session) q = q.session(session);
    const conflict = await q;

    return !conflict; // returns true if dates are free, false if overlapping
}

// 1. GET /bookings - Guest "My Trips" Dashboard
module.exports.renderMyTrips = async (req, res) => {
    const now = new Date();
    const bookings = await Booking.find({ user: req.user._id })
        .populate({
            path: "listing",
            populate: { path: "owner" }
        })
        .sort({ checkIn: -1 });

    // Filter out orphaned bookings where listing was deleted
    const validBookings = bookings.filter(b => b.listing != null);

    const upcoming = validBookings.filter(b => b.status === "Confirmed" && new Date(b.checkOut) >= now);
    const previous = validBookings.filter(b => b.status === "Confirmed" && new Date(b.checkOut) < now);
    const cancelled = validBookings.filter(b => b.status === "Cancelled");
    const pending = validBookings.filter(b => b.status === "Pending");

    if (req.xhr || req.headers.accept?.includes("application/json")) {
        return res.json({
            success: true,
            counts: {
                total: validBookings.length,
                upcoming: upcoming.length,
                previous: previous.length,
                cancelled: cancelled.length,
                pending: pending.length
            },
            bookings: validBookings
        });
    }

    res.render("bookings/index.ejs", {
        upcoming,
        previous,
        cancelled,
        pending,
        allBookings: validBookings,
        pageTitle: "My Trips & Reservations"
    });
};

// 2. GET /bookings/:id - Booking Confirmation / Receipt Details
module.exports.renderBookingDetails = async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        req.flash("error", "Invalid booking reference number.");
        return res.redirect("/bookings");
    }

    const booking = await Booking.findById(id)
        .populate({
            path: "listing",
            populate: { path: "owner" }
        })
        .populate("user");

    if (!booking || !booking.listing) {
        req.flash("error", "Reservation not found or listing no longer exists.");
        return res.redirect("/bookings");
    }

    // Access control: Guest who booked OR Host who owns the listing
    const isGuest = booking.user._id.equals(req.user._id);
    const isHost = booking.listing.owner && booking.listing.owner._id.equals(req.user._id);

    if (!isGuest && !isHost) {
        if (req.xhr || req.headers.accept?.includes("application/json")) {
            return res.status(403).json({ success: false, message: "Unauthorized access to this reservation." });
        }
        req.flash("error", "You do not have permission to view this reservation.");
        return res.redirect("/bookings");
    }

    if (req.xhr || req.headers.accept?.includes("application/json")) {
        return res.json({ success: true, booking, isGuest, isHost });
    }

    res.render("bookings/show.ejs", {
        booking,
        isGuest,
        isHost,
        pageTitle: `Reservation #${booking._id.toString().slice(-8).toUpperCase()}`
    });
};

// 3. POST /bookings - Create a New Reservation
module.exports.createBooking = async (req, res) => {
    let { listingId, checkIn, checkOut, guests } = req.body;

    // Validate listingId
    if (!listingId || !mongoose.Types.ObjectId.isValid(listingId)) {
        const msg = "Invalid property reference.";
        if (req.xhr || req.headers.accept?.includes("application/json")) {
            return res.status(400).json({ success: false, message: msg });
        }
        req.flash("error", msg);
        return res.redirect("/listings");
    }

    // Fetch listing
    const listing = await Listing.findById(listingId);
    if (!listing) {
        const msg = "The requested listing could not be found.";
        if (req.xhr || req.headers.accept?.includes("application/json")) {
            return res.status(404).json({ success: false, message: msg });
        }
        req.flash("error", msg);
        return res.redirect("/listings");
    }

    // Parse & Normalize Dates
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
        const msg = "Please provide valid check-in and check-out dates.";
        if (req.xhr || req.headers.accept?.includes("application/json")) {
            return res.status(400).json({ success: false, message: msg });
        }
        req.flash("error", msg);
        return res.redirect(`/listings/${listingId}`);
    }

    // Normalize to date-only at midnight UTC to prevent timezone offsets
    checkInDate.setUTCHours(0, 0, 0, 0);
    checkOutDate.setUTCHours(0, 0, 0, 0);

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    // Reject past check-in dates
    if (checkInDate < today) {
        const msg = "Check-in date cannot be in the past.";
        if (req.xhr || req.headers.accept?.includes("application/json")) {
            return res.status(400).json({ success: false, message: msg });
        }
        req.flash("error", msg);
        return res.redirect(`/listings/${listingId}`);
    }

    // Check-out must be strictly after check-in
    if (checkOutDate <= checkInDate) {
        const msg = "Check-out date must be at least 1 day after check-in date.";
        if (req.xhr || req.headers.accept?.includes("application/json")) {
            return res.status(400).json({ success: false, message: msg });
        }
        req.flash("error", msg);
        return res.redirect(`/listings/${listingId}`);
    }

    // Maximum stay limit check (60 nights)
    const msPerDay = 1000 * 60 * 60 * 24;
    const requestedNights = Math.round((checkOutDate.getTime() - checkInDate.getTime()) / msPerDay);
    if (requestedNights > 60) {
        const msg = "Maximum stay duration is 60 nights per reservation.";
        if (req.xhr || req.headers.accept?.includes("application/json")) {
            return res.status(400).json({ success: false, message: msg });
        }
        req.flash("error", msg);
        return res.redirect(`/listings/${listingId}`);
    }

    // Validate guest capacity
    const numGuests = parseInt(guests, 10);
    const maxAllowedGuests = listing.maxGuests || 4;
    if (isNaN(numGuests) || numGuests < 1 || numGuests > maxAllowedGuests) {
        const msg = `Guest count must be between 1 and ${maxAllowedGuests} for this property.`;
        if (req.xhr || req.headers.accept?.includes("application/json")) {
            return res.status(400).json({ success: false, message: msg });
        }
        req.flash("error", msg);
        return res.redirect(`/listings/${listingId}`);
    }

    // Calculate official server prices (never trusting client calculation)
    let pricing;
    try {
        pricing = calculateBookingPricing(listing.price, checkInDate, checkOutDate);
    } catch (pricingErr) {
        if (req.xhr || req.headers.accept?.includes("application/json")) {
            return res.status(400).json({ success: false, message: pricingErr.message });
        }
        req.flash("error", pricingErr.message);
        return res.redirect(`/listings/${listingId}`);
    }

    // Acquire concurrency-safe reservation lock for this listing
    const releaseLock = await acquireListingLock(listingId);

    try {
        // Re-check availability immediately before insert
        const isFree = await checkAvailability(listingId, checkInDate, checkOutDate);
        if (!isFree) {
            const msg = "Selected dates are already booked for this property. Please choose different dates.";
            if (req.xhr || req.headers.accept?.includes("application/json")) {
                return res.status(409).json({ success: false, message: msg });
            }
            req.flash("error", msg);
            return res.redirect(`/listings/${listingId}`);
        }

        // Optional Coupon Discount Evaluation (Feature 7)
        let discountAmount = 0;
        let appliedCouponCode = "";
        if (req.body.couponCode && typeof req.body.couponCode === "string") {
            const coupon = await Coupon.findOne({
                code: req.body.couponCode.trim().toUpperCase(),
                isActive: true
            });
            if (coupon) {
                const notExpired = !coupon.expiresAt || new Date(coupon.expiresAt) > new Date();
                const underLimit = !coupon.usageLimit || coupon.usedCount < coupon.usageLimit;
                const meetsMin = pricing.totalPrice >= (coupon.minBookingAmount || 0);

                if (notExpired && underLimit && meetsMin) {
                    appliedCouponCode = coupon.code;
                    if (coupon.discountType === "percentage") {
                        discountAmount = Math.min(coupon.maxDiscount || 5000, Math.round(pricing.totalPrice * (coupon.discountValue / 100)));
                    } else {
                        discountAmount = Math.min(pricing.totalPrice, coupon.discountValue);
                    }
                    coupon.usedCount = (coupon.usedCount || 0) + 1;
                    await coupon.save();
                }
            }
        }

        const calculatedFinalTotal = Math.max(0, pricing.totalPrice - discountAmount);

        const bookingDoc = {
            listing: listing._id,
            user: req.user._id,
            checkIn: checkInDate,
            checkOut: checkOutDate,
            guests: numGuests,
            nights: pricing.nights,
            basePrice: pricing.basePrice,
            cleaningFee: pricing.cleaningFee,
            serviceFee: pricing.serviceFee,
            tax: pricing.tax,
            discountAmount,
            couponCode: appliedCouponCode,
            totalPrice: calculatedFinalTotal,
            status: "Confirmed",
            paymentStatus: "Unpaid"
        };

        const savedBooking = await Booking.create(bookingDoc);

        // Notify Guest (Feature 4)
        await Notification.create({
            user: req.user._id,
            title: "Booking Confirmed",
            message: `Your reservation at "${listing.title}" for ${pricing.nights} nights is confirmed! Reference: #WL-${savedBooking._id.toString().slice(-8).toUpperCase()}`,
            type: "booking_confirmed",
            link: `/bookings/${savedBooking._id}`
        }).catch(() => {});

        // Notify Host (Feature 4)
        if (listing.owner && !listing.owner.equals(req.user._id)) {
            await Notification.create({
                user: listing.owner,
                sender: req.user._id,
                title: "New Booking Received",
                message: `${req.user.username} reserved "${listing.title}" (${pricing.nights} nights, ₹${calculatedFinalTotal.toLocaleString("en-IN")}).`,
                type: "booking_confirmed",
                link: `/bookings/${savedBooking._id}`
            }).catch(() => {});
        }

        if (req.xhr || req.headers.accept?.includes("application/json")) {
            return res.status(201).json({
                success: true,
                message: "Reservation confirmed successfully!",
                bookingId: savedBooking._id,
                redirectUrl: `/bookings/${savedBooking._id}`
            });
        }

        req.flash("success", "Reservation confirmed! Have a wonderful trip.");
        return res.redirect(`/bookings/${savedBooking._id}`);

    } finally {
        releaseLock();
    }
};

// 4. PATCH /bookings/:id/cancel - Cancel Reservation (Guest or Host)
module.exports.cancelBooking = async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        const msg = "Invalid booking reference.";
        if (req.xhr || req.headers.accept?.includes("application/json")) {
            return res.status(400).json({ success: false, message: msg });
        }
        req.flash("error", msg);
        return res.redirect("/bookings");
    }

    const booking = await Booking.findById(id).populate("listing");
    if (!booking) {
        const msg = "Reservation not found.";
        if (req.xhr || req.headers.accept?.includes("application/json")) {
            return res.status(404).json({ success: false, message: msg });
        }
        req.flash("error", msg);
        return res.redirect("/bookings");
    }

    // Authorization: Guest who booked OR Host who owns property
    const isGuest = booking.user.equals(req.user._id);
    const isHost = booking.listing && booking.listing.owner.equals(req.user._id);

    if (!isGuest && !isHost) {
        const msg = "You are not authorized to cancel this reservation.";
        if (req.xhr || req.headers.accept?.includes("application/json")) {
            return res.status(403).json({ success: false, message: msg });
        }
        req.flash("error", msg);
        return res.redirect("/bookings");
    }

    // If already cancelled
    if (booking.status === "Cancelled") {
        const msg = "This reservation has already been cancelled.";
        if (req.xhr || req.headers.accept?.includes("application/json")) {
            return res.status(400).json({ success: false, message: msg });
        }
        req.flash("error", msg);
        return res.redirect(`/bookings/${booking._id}`);
    }

    // Cancellation rule: Cannot cancel after check-in date has passed
    const now = new Date();
    now.setUTCHours(0, 0, 0, 0);
    const checkInDate = new Date(booking.checkIn);
    checkInDate.setUTCHours(0, 0, 0, 0);

    if (checkInDate < now) {
        const msg = "Reservations cannot be cancelled after the check-in date has passed.";
        if (req.xhr || req.headers.accept?.includes("application/json")) {
            return res.status(400).json({ success: false, message: msg });
        }
        req.flash("error", msg);
        return res.redirect(`/bookings/${booking._id}`);
    }

    booking.status = "Cancelled";
    if (booking.paymentStatus === "Paid") {
        booking.paymentStatus = "Refunded";
    }
    await booking.save();

    // Dispatch Cancellation Notifications (Feature 4)
    await Notification.create({
        user: booking.user,
        title: "Reservation Cancelled",
        message: `Your reservation for "${booking.listing.title}" has been cancelled.`,
        type: "booking_cancelled",
        link: `/bookings/${booking._id}`
    }).catch(() => {});

    if (booking.listing.owner && !booking.listing.owner.equals(booking.user)) {
        await Notification.create({
            user: booking.listing.owner,
            sender: req.user._id,
            title: "Guest Cancelled Reservation",
            message: `The booking for "${booking.listing.title}" was cancelled. The dates are now reopened for new bookings.`,
            type: "booking_cancelled",
            link: "/bookings/host"
        }).catch(() => {});
    }

    if (req.xhr || req.headers.accept?.includes("application/json")) {
        return res.status(200).json({
            success: true,
            message: "Reservation successfully cancelled.",
            bookingId: booking._id,
            status: "Cancelled"
        });
    }

    req.flash("success", "Reservation successfully cancelled. The dates are now freed for booking.");
    res.redirect(`/bookings/${booking._id}`);
};

// 5. GET /bookings/host - Host Reservations & Revenue Dashboard
module.exports.renderHostDashboard = async (req, res) => {
    // 1. Find all listings owned by current user
    const hostListings = await Listing.find({ owner: req.user._id });
    const listingIds = hostListings.map(l => l._id);

    // 2. Find all bookings for these listings
    const incomingBookings = await Booking.find({ listing: { $in: listingIds } })
        .populate("listing")
        .populate("user")
        .sort({ checkIn: 1 });

    const now = new Date();

    // 3. Compute summaries
    const confirmedBookings = incomingBookings.filter(b => b.status === "Confirmed");
    const pendingBookings = incomingBookings.filter(b => b.status === "Pending");
    const cancelledBookings = incomingBookings.filter(b => b.status === "Cancelled");
    const upcomingCheckins = confirmedBookings.filter(b => new Date(b.checkIn) >= now);

    const totalRevenue = confirmedBookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0);

    if (req.xhr || req.headers.accept?.includes("application/json")) {
        return res.json({
            success: true,
            summary: {
                totalListings: hostListings.length,
                totalBookings: incomingBookings.length,
                confirmedCount: confirmedBookings.length,
                pendingCount: pendingBookings.length,
                cancelledCount: cancelledBookings.length,
                totalRevenue
            },
            bookings: incomingBookings
        });
    }

    res.render("bookings/host.ejs", {
        hostListings,
        incomingBookings,
        confirmedBookings,
        pendingBookings,
        cancelledBookings,
        upcomingCheckins,
        totalRevenue,
        pageTitle: "Host Reservation Management"
    });
};

// 6. PATCH /bookings/:id/confirm - Host Confirms a Pending Reservation
module.exports.confirmBookingByHost = async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        req.flash("error", "Invalid booking reference.");
        return res.redirect("/bookings/host");
    }

    const booking = await Booking.findById(id).populate("listing");
    if (!booking || !booking.listing) {
        req.flash("error", "Booking or listing not found.");
        return res.redirect("/bookings/host");
    }

    // Verify host ownership of listing
    if (!booking.listing.owner.equals(req.user._id)) {
        if (req.xhr || req.headers.accept?.includes("application/json")) {
            return res.status(403).json({ success: false, message: "Unauthorized: You do not own this listing." });
        }
        req.flash("error", "You do not own this property.");
        return res.redirect("/bookings/host");
    }

    // Recheck availability before confirming
    const isAvailable = await checkAvailability(booking.listing._id, booking.checkIn, booking.checkOut, booking._id);
    if (!isAvailable) {
        req.flash("error", "Cannot confirm: another confirmed reservation now overlaps with these dates.");
        return res.redirect("/bookings/host");
    }

    booking.status = "Confirmed";
    await booking.save();

    req.flash("success", "Reservation confirmed for guest!");
    res.redirect("/bookings/host");
};

// 7. GET /bookings/check-availability - Public API for instant client calculation & availability check
module.exports.checkListingAvailabilityAPI = async (req, res) => {
    const { listingId, checkIn, checkOut } = req.query;

    if (!listingId || !mongoose.Types.ObjectId.isValid(listingId)) {
        return res.status(400).json({ success: false, message: "Invalid listing ID" });
    }

    const listing = await Listing.findById(listingId);
    if (!listing) {
        return res.status(404).json({ success: false, message: "Listing not found" });
    }

    if (!checkIn || !checkOut) {
        return res.json({ available: true, maxGuests: listing.maxGuests || 4, pricePerNight: listing.price });
    }

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    checkInDate.setUTCHours(0, 0, 0, 0);
    checkOutDate.setUTCHours(0, 0, 0, 0);

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    if (checkInDate < today || checkOutDate <= checkInDate) {
        return res.status(400).json({ success: false, message: "Invalid date range" });
    }

    const available = await checkAvailability(listingId, checkInDate, checkOutDate);
    let pricing = null;
    if (available) {
        pricing = calculateBookingPricing(listing.price, checkInDate, checkOutDate);
    }

    res.json({
        success: true,
        available,
        pricing,
        maxGuests: listing.maxGuests || 4
    });
};

// 8. POST /bookings/apply-coupon - Client AJAX endpoint to validate & preview coupon savings
module.exports.applyCouponAPI = async (req, res) => {
    let { code, amount, listingId, nights } = req.body;

    if (!code || !code.trim()) {
        return res.status(400).json({ success: false, message: "Please provide a coupon code." });
    }

    const coupon = await Coupon.findOne({
        code: code.trim().toUpperCase(),
        isActive: true
    });

    if (!coupon) {
        return res.status(404).json({ success: false, message: "Invalid or expired coupon code." });
    }

    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
        return res.status(400).json({ success: false, message: "This coupon has expired." });
    }

    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
        return res.status(400).json({ success: false, message: "Coupon usage limit reached." });
    }

    let subtotal = Number(amount) || 0;
    if (!subtotal && listingId) {
        const listing = await Listing.findById(listingId);
        if (listing && listing.price) {
            const n = Math.max(1, Number(nights) || 1);
            const basePrice = listing.price * n;
            const cleaningFee = Math.round(listing.price * 0.10);
            const serviceFee = Math.round(basePrice * 0.05);
            const tax = Math.round((basePrice + cleaningFee + serviceFee) * 0.18);
            subtotal = basePrice + cleaningFee + serviceFee + tax;
        }
    }

    if (subtotal < (coupon.minBookingAmount || 0)) {
        return res.status(400).json({
            success: false,
            message: `Coupon requires a minimum booking amount of ₹${coupon.minBookingAmount.toLocaleString("en-IN")}.`
        });
    }

    let discount = 0;
    if (coupon.discountType === "percentage") {
        discount = Math.min(coupon.maxDiscount || 5000, Math.round(subtotal * (coupon.discountValue / 100)));
    } else {
        discount = Math.min(subtotal, coupon.discountValue);
    }

    const newTotal = Math.max(0, subtotal - discount);

    res.json({
        success: true,
        code: coupon.code,
        discountAmount: discount,
        newTotal,
        message: `Coupon "${coupon.code}" applied! You saved ₹${discount.toLocaleString("en-IN")}.`
    });
};

// 9. GET /bookings/host/analytics - Detailed Host Performance Analytics (Feature 6)
module.exports.renderHostAnalytics = async (req, res) => {
    const hostListings = await Listing.find({ owner: req.user._id });
    const listingIds = hostListings.map(l => l._id);

    const bookings = await Booking.find({ listing: { $in: listingIds }, status: "Confirmed" })
        .populate("listing")
        .populate("user");

    const totalRevenue = bookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0);
    const totalNightsBooked = bookings.reduce((sum, b) => sum + (b.nights || 0), 0);

    // 30-day occupancy calculation across active host listings
    const availableTotalNights = Math.max(1, hostListings.length * 30);
    const occupancyRate = Math.min(100, Math.round((totalNightsBooked / availableTotalNights) * 100));

    // Monthly Earnings Breakdown
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthlyEarnings = {};
    months.forEach(m => { monthlyEarnings[m] = 0; });

    bookings.forEach(b => {
        const d = new Date(b.checkIn);
        const m = months[d.getMonth()];
        monthlyEarnings[m] = (monthlyEarnings[m] || 0) + (b.totalPrice || 0);
    });

    const averageBookingValue = bookings.length > 0 ? Math.round(totalRevenue / bookings.length) : 0;

    res.render("bookings/analytics.ejs", {
        hostListings,
        totalBookingsCount: bookings.length,
        totalRevenue,
        totalNightsBooked,
        occupancyRate,
        averageBookingValue,
        monthlyEarnings,
        months,
        pageTitle: "Host Analytics & Performance"
    });
};

// 10. POST /listings/:id/calendar/block - Host blocks/unblocks a maintenance date (Feature 10)
module.exports.toggleBlockedDate = async (req, res) => {
    const { id } = req.params;
    const { date } = req.body;

    const listing = await Listing.findById(id);
    if (!listing || !listing.owner.equals(req.user._id)) {
        req.flash("error", "Unauthorized to edit calendar for this listing.");
        return res.redirect("/bookings/host");
    }

    if (!listing.blockedDates) {
        listing.blockedDates = [];
    }

    const targetDate = new Date(date);
    targetDate.setUTCHours(0, 0, 0, 0);

    const existsIndex = listing.blockedDates.findIndex(d => new Date(d).getTime() === targetDate.getTime());
    if (existsIndex > -1) {
        listing.blockedDates.splice(existsIndex, 1);
        req.flash("success", `Date ${targetDate.toLocaleDateString()} unblocked.`);
    } else {
        listing.blockedDates.push(targetDate);
        req.flash("success", `Date ${targetDate.toLocaleDateString()} blocked from guest reservations.`);
    }
    await listing.save();
    res.redirect(`/listings/${id}`);
};
