const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync");
const { isLoggedIn, isAdmin } = require("../middleware");
const adminController = require("../controllers/admin");

// Apply authentication & admin authorization to all admin routes
router.use(isLoggedIn, isAdmin);

// 1. Dashboard Overview
router.get("/", wrapAsync(adminController.renderDashboard));

// 2. User Management
router.get("/users", wrapAsync(adminController.renderUsers));
router.patch("/users/:id/role", wrapAsync(adminController.updateUserRole));
router.delete("/users/:id", wrapAsync(adminController.deleteUser));

// 3. Listing Management
router.get("/listings", wrapAsync(adminController.renderListings));
router.delete("/listings/:id", wrapAsync(adminController.deleteListing));

// 4. Booking Management
router.get("/bookings", wrapAsync(adminController.renderBookings));

// 5. Coupon Management
router.get("/coupons", wrapAsync(adminController.renderCoupons));
router.post("/coupons", wrapAsync(adminController.createCoupon));
router.delete("/coupons/:id", wrapAsync(adminController.deleteCoupon));

module.exports = router;

