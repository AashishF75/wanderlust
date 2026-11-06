const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync");
const { isLoggedIn } = require("../middleware");
const bookingController = require("../controllers/booking");

// Public API for checking dates availability & dynamic price breakdown
router.get("/check-availability", wrapAsync(bookingController.checkListingAvailabilityAPI));
router.post("/apply-coupon", wrapAsync(bookingController.applyCouponAPI));

// Host Dashboard & Analytics - Must be declared before /:id parameter route
router.get("/host", isLoggedIn, wrapAsync(bookingController.renderHostDashboard));
router.get("/host/analytics", isLoggedIn, wrapAsync(bookingController.renderHostAnalytics));

// Guest Dashboard & Reservation Creation
router.route("/")
    .get(isLoggedIn, wrapAsync(bookingController.renderMyTrips))
    .post(isLoggedIn, wrapAsync(bookingController.createBooking));

// Single Booking Details / Confirmation
router.route("/:id")
    .get(isLoggedIn, wrapAsync(bookingController.renderBookingDetails));

// Cancellation Route (Supports PATCH and POST with method-override)
router.route("/:id/cancel")
    .patch(isLoggedIn, wrapAsync(bookingController.cancelBooking))
    .post(isLoggedIn, wrapAsync(bookingController.cancelBooking));

// Host Confirmation Action
router.route("/:id/confirm")
    .patch(isLoggedIn, wrapAsync(bookingController.confirmBookingByHost))
    .post(isLoggedIn, wrapAsync(bookingController.confirmBookingByHost));

module.exports = router;

