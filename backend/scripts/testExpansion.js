const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const mongoose = require("mongoose");
const http = require("http");
const User = require("../models/user.js");
const Listing = require("../models/list.js");
const Booking = require("../models/booking.js");
const Review = require("../models/reviews.js");
const Coupon = require("../models/coupon.js");
const Message = require("../models/message.js");
const Notification = require("../models/notification.js");

function httpRequest(options, postData = null) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let body = "";
            res.on("data", (chunk) => (body += chunk));
            res.on("end", () => {
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    body,
                });
            });
        });
        req.on("error", reject);
        if (postData) {
            req.write(postData);
        }
        req.end();
    });
}

function parseCookies(resHeaders) {
    const setCookie = resHeaders["set-cookie"];
    if (!setCookie) return "";
    return setCookie.map((c) => c.split(";")[0]).join("; ");
}

async function loginUser(username, password) {
    const postData = `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
    const res = await httpRequest(
        {
            hostname: "localhost",
            port: 8080,
            path: "/login",
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Content-Length": Buffer.byteLength(postData),
            },
        },
        postData
    );
    return parseCookies(res.headers);
}

async function runExpansionTests() {
    console.log("==================================================");
    console.log("    WANDERLUST EXPANSION SUITE (10 FEATURES)      ");
    console.log("==================================================");

    let passed = 0;
    let total = 0;

    function assert(desc, condition) {
        total++;
        if (condition) {
            console.log(`[PASS] ${total}. ${desc}`);
            passed++;
        } else {
            console.error(`[FAIL] ${total}. ${desc}`);
        }
    }

    try {
        await mongoose.connect(process.env.ATLAS_URI);

        // Setup test users
        let adminUser = await User.findOne({ username: "demo" });
        if (!adminUser) {
            adminUser = await User.register(new User({ username: "demo", email: "demo@wanderlust.com", role: "admin" }), "Demo@12345");
        } else if (adminUser.role !== "admin") {
            adminUser.role = "admin";
            await adminUser.save();
        }

        let regularGuest = await User.findOne({ username: "guest_tester" });
        if (!regularGuest) {
            regularGuest = await User.register(new User({ username: "guest_tester", email: "guest@test.com", role: "guest" }), "Password123!");
        }

        let sampleListing = await Listing.findOne();
        if (!sampleListing) {
            console.error("No sample listing found in database.");
            return;
        }

        // Test 1: Map View Endpoint
        const mapRes = await httpRequest({
            hostname: "localhost",
            port: 8080,
            path: "/listings/map",
            method: "GET",
        });
        assert("Map Explore view returns HTTP 200 & interactive Mapbox container", mapRes.statusCode === 200 && (mapRes.body.includes("Interactive Stays Map") || mapRes.body.includes("exploreMap")));

        // Test 2: Advanced Search & Filtering
        const searchRes = await httpRequest({
            hostname: "localhost",
            port: 8080,
            path: "/listings?minPrice=1000&maxPrice=50000&sort=price_asc",
            method: "GET",
        });
        assert("Advanced search with minPrice, maxPrice & sort returns HTTP 200", searchRes.statusCode === 200);

        // Test 3: Coupon Validation Endpoint
        let coupon = await Coupon.findOne({ code: "WELCOME10" });
        if (!coupon) {
            coupon = await Coupon.create({
                code: "WELCOME10",
                discountType: "percentage",
                discountValue: 10,
                minBookingAmount: 1000,
                maxDiscount: 2000,
                isActive: true,
                usageLimit: 100,
            });
        }

        const couponPayload = JSON.stringify({
            code: "WELCOME10",
            listingId: sampleListing._id.toString(),
            nights: 3,
        });

        const couponRes = await httpRequest(
            {
                hostname: "localhost",
                port: 8080,
                path: "/bookings/apply-coupon",
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Content-Length": Buffer.byteLength(couponPayload),
                },
            },
            couponPayload
        );
        const couponData = JSON.parse(couponRes.body);
        assert("Valid coupon calculation returns 200 and discount amount", couponRes.statusCode === 200 && couponData.success === true && couponData.discountAmount > 0);

        // Test 4: Invalid Coupon
        const invalidCouponPayload = JSON.stringify({
            code: "NONEXISTENT999",
            listingId: sampleListing._id.toString(),
            nights: 2,
        });
        const invalidCouponRes = await httpRequest(
            {
                hostname: "localhost",
                port: 8080,
                path: "/bookings/apply-coupon",
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Content-Length": Buffer.byteLength(invalidCouponPayload),
                },
            },
            invalidCouponPayload
        );
        const invalidCouponData = JSON.parse(invalidCouponRes.body);
        assert("Invalid coupon returns 404 and rejection message", (invalidCouponRes.statusCode === 404 || invalidCouponRes.statusCode === 400) && invalidCouponData.success === false);

        // Test 5: Admin Route Protection (Guest role blocked)
        const guestCookie = await loginUser("guest_tester", "Password123!");
        const adminAccessGuest = await httpRequest({
            hostname: "localhost",
            port: 8080,
            path: "/admin",
            method: "GET",
            headers: {
                Cookie: guestCookie,
                Accept: "application/json",
            },
        });
        assert("Guest role access to /admin blocked with HTTP 403 Forbidden", adminAccessGuest.statusCode === 403);

        // Test 6: Admin Route Access (Admin role allowed)
        const adminCookie = await loginUser("demo", "Demo@12345");
        const adminAccessRes = await httpRequest({
            hostname: "localhost",
            port: 8080,
            path: "/admin",
            method: "GET",
            headers: { Cookie: adminCookie },
        });
        assert("Admin role access to /admin returns HTTP 200", adminAccessRes.statusCode === 200 && adminAccessRes.body.includes("Admin Console"));

        // Test 7: Admin Users, Listings, Bookings & Coupons sub-routes
        const adminUsersRes = await httpRequest({
            hostname: "localhost",
            port: 8080,
            path: "/admin/users",
            method: "GET",
            headers: { Cookie: adminCookie },
        });
        const adminCouponsRes = await httpRequest({
            hostname: "localhost",
            port: 8080,
            path: "/admin/coupons",
            method: "GET",
            headers: { Cookie: adminCookie },
        });
        assert("Admin sub-routes (/admin/users, /admin/coupons) return HTTP 200", adminUsersRes.statusCode === 200 && adminCouponsRes.statusCode === 200);

        // Test 8: Host Analytics Endpoint
        const hostAnalyticsRes = await httpRequest({
            hostname: "localhost",
            port: 8080,
            path: "/bookings/host/analytics",
            method: "GET",
            headers: { Cookie: adminCookie },
        });
        assert("Host Analytics returns HTTP 200 with revenue breakdown", hostAnalyticsRes.statusCode === 200 && hostAnalyticsRes.body.includes("Host Analytics"));

        // Test 9: Verified Guest Review Restriction
        // Guest has not booked this listing, should be blocked with 403 when requesting via JSON
        const fakeReviewPost = `review[rating]=5&review[comment]=Unauthorized+guest+review`;
        const reviewBlockRes = await httpRequest(
            {
                hostname: "localhost",
                port: 8080,
                path: `/listings/${sampleListing._id}/reviews`,
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    "Content-Length": Buffer.byteLength(fakeReviewPost),
                    Cookie: guestCookie,
                    Accept: "application/json",
                },
            },
            fakeReviewPost
        );
        assert("Unverified guest review submission is rejected with HTTP 403", reviewBlockRes.statusCode === 403);

        // Test 10: Verified Guest Review Allowed & Rating Stats Updated
        // Create verified booking for guest_tester with required fields
        const testBooking = await Booking.create({
            listing: sampleListing._id,
            user: regularGuest._id,
            checkIn: new Date(Date.now() + 86400000 * 30),
            checkOut: new Date(Date.now() + 86400000 * 33),
            nights: 3,
            basePrice: 12000,
            guests: 2,
            totalPrice: 15000,
            status: "Confirmed",
            paymentStatus: "Unpaid",
        });

        const verifiedReviewPost = `review[rating]=5&review[comment]=Exceptional+stay+and+impeccable+service!`;
        const verifiedReviewRes = await httpRequest(
            {
                hostname: "localhost",
                port: 8080,
                path: `/listings/${sampleListing._id}/reviews`,
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    "Content-Length": Buffer.byteLength(verifiedReviewPost),
                    Cookie: guestCookie,
                },
            },
            verifiedReviewPost
        );
        assert("Verified guest review submitted successfully (HTTP 302 Redirect)", verifiedReviewRes.statusCode === 302);

        // Check that review was saved with isVerifiedGuest: true
        const createdReview = await Review.findOne({ author: regularGuest._id, comment: /Exceptional stay/ });
        assert("Review stored with isVerifiedGuest flag and linked booking", createdReview && createdReview.isVerifiedGuest === true);

        // Test 11: Guest-Host Messaging System
        const msgPayload = `listingId=${sampleListing._id}&recipientId=${adminUser._id}&content=${encodeURIComponent("Hello host, is early check-in available?")}`;
        const msgRes = await httpRequest(
            {
                hostname: "localhost",
                port: 8080,
                path: "/messages",
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    "Content-Length": Buffer.byteLength(msgPayload),
                    Cookie: guestCookie,
                },
            },
            msgPayload
        );
        assert("Guest can send direct message to host (HTTP 302 /messages/thread)", msgRes.statusCode === 302);

        // Verify message thread view
        const threadRes = await httpRequest({
            hostname: "localhost",
            port: 8080,
            path: `/messages/thread?listingId=${sampleListing._id}&userId=${adminUser._id}`,
            method: "GET",
            headers: { Cookie: guestCookie },
        });
        assert("Message thread view returns HTTP 200 and conversation content", threadRes.statusCode === 200 && threadRes.body.includes("Hello host, is early check-in"));

        // Test 12: Notification System
        const notificationsRes = await httpRequest({
            hostname: "localhost",
            port: 8080,
            path: "/notifications",
            method: "GET",
            headers: { Cookie: adminCookie },
        });
        assert("Notifications feed returns HTTP 200", notificationsRes.statusCode === 200 && notificationsRes.body.includes("Notifications"));

        // Clean up test data
        if (createdReview) {
            await Review.findByIdAndDelete(createdReview._id);
            await Listing.findByIdAndUpdate(sampleListing._id, { $pull: { reviews: createdReview._id } });
        }
        if (testBooking) {
            await Booking.findByIdAndDelete(testBooking._id);
        }
        await Message.deleteMany({ content: /Hello host/ });

        console.log("--------------------------------------------------");
        console.log(`EXPANSION TEST SUMMARY: ${passed} / ${total} tests passed.`);
        console.log("--------------------------------------------------");
    } catch (err) {
        console.error("Test execution error:", err);
    } finally {
        await mongoose.disconnect();
        process.exitCode = 0;
    }
}

runExpansionTests();
