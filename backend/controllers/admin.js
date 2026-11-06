const User = require("../models/user");
const Listing = require("../models/list");
const Booking = require("../models/booking");
const Coupon = require("../models/coupon");

// 1. GET /admin - Main Admin Dashboard Overview
module.exports.renderDashboard = async (req, res) => {
    const totalUsers = await User.countDocuments();
    const totalListings = await Listing.countDocuments();
    const totalBookings = await Booking.countDocuments();

    const confirmedBookings = await Booking.find({ status: "Confirmed" });
    const totalGrossRevenue = confirmedBookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0);
    const platformCommission = confirmedBookings.reduce((sum, b) => sum + (b.serviceFee || 0), 0);

    const recentBookings = await Booking.find()
        .populate("listing", "title location")
        .populate("user", "username email")
        .sort({ createdAt: -1 })
        .limit(6);

    const recentUsers = await User.find()
        .sort({ _id: -1 })
        .limit(6);

    res.render("admin/index.ejs", {
        stats: {
            totalUsers,
            totalListings,
            totalBookings,
            totalGrossRevenue,
            platformCommission
        },
        recentBookings,
        recentUsers,
        pageTitle: "Wanderlust Admin Console"
    });
};

// 2. GET /admin/users - User Management
module.exports.renderUsers = async (req, res) => {
    const users = await User.find().sort({ _id: -1 });
    res.render("admin/users.ejs", { users, pageTitle: "Admin - User Management" });
};

// 3. PATCH /admin/users/:id/role - Update user role
module.exports.updateUserRole = async (req, res) => {
    const { id } = req.params;
    const { role } = req.body;

    if (!["guest", "host", "admin"].includes(role)) {
        req.flash("error", "Invalid user role specified.");
        return res.redirect("/admin/users");
    }

    await User.findByIdAndUpdate(id, { $set: { role } });
    req.flash("success", "User role updated successfully.");
    res.redirect("/admin/users");
};

// 4. DELETE /admin/users/:id - Delete user
module.exports.deleteUser = async (req, res) => {
    const { id } = req.params;
    if (req.user._id.equals(id)) {
        req.flash("error", "You cannot delete your own admin account.");
        return res.redirect("/admin/users");
    }

    await User.findByIdAndDelete(id);
    req.flash("success", "User deleted successfully.");
    res.redirect("/admin/users");
};

// 5. GET /admin/listings - Listing Management
module.exports.renderListings = async (req, res) => {
    const listings = await Listing.find().populate("owner", "username email").sort({ _id: -1 });
    res.render("admin/listings.ejs", { listings, pageTitle: "Admin - Listing Management" });
};

// 6. DELETE /admin/listings/:id - Delete listing as admin
module.exports.deleteListing = async (req, res) => {
    const { id } = req.params;
    await Listing.findByIdAndDelete(id);
    req.flash("success", "Listing removed by platform administrator.");
    res.redirect("/admin/listings");
};

// 7. GET /admin/bookings - Booking Management
module.exports.renderBookings = async (req, res) => {
    const { status } = req.query;
    let filter = {};
    if (status) filter.status = status;

    const bookings = await Booking.find(filter)
        .populate("listing", "title location")
        .populate("user", "username email")
        .sort({ createdAt: -1 });

    res.render("admin/bookings.ejs", {
        bookings,
        selectedStatus: status || "all",
        pageTitle: "Admin - Booking Management"
    });
};

// 8. GET /admin/coupons - Coupon Management
module.exports.renderCoupons = async (req, res) => {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    res.render("admin/coupons.ejs", { coupons, pageTitle: "Admin - Coupon Management" });
};

// 9. POST /admin/coupons - Create coupon
module.exports.createCoupon = async (req, res) => {
    const { code, discountType, discountValue, minBookingAmount, maxDiscount, expiresAt, usageLimit } = req.body;

    const newCoupon = new Coupon({
        code: code.trim().toUpperCase(),
        discountType: discountType || "percentage",
        discountValue: Number(discountValue),
        minBookingAmount: Number(minBookingAmount) || 0,
        maxDiscount: Number(maxDiscount) || 5000,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        usageLimit: Number(usageLimit) || 100,
        createdBy: req.user._id
    });

    await newCoupon.save();
    req.flash("success", `Coupon "${newCoupon.code}" created successfully!`);
    res.redirect("/admin/coupons");
};

// 10. DELETE /admin/coupons/:id - Delete coupon
module.exports.deleteCoupon = async (req, res) => {
    const { id } = req.params;
    await Coupon.findByIdAndDelete(id);
    req.flash("success", "Coupon deleted.");
    res.redirect("/admin/coupons");
};

