const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync");
const { isLoggedIn } = require("../middleware");
const notificationController = require("../controllers/notification");

router.get("/", isLoggedIn, wrapAsync(notificationController.renderNotifications));
router.patch("/read-all", isLoggedIn, wrapAsync(notificationController.markAllAsRead));
router.patch("/:id/read", isLoggedIn, wrapAsync(notificationController.markAsRead));
router.delete("/:id", isLoggedIn, wrapAsync(notificationController.deleteNotification));

module.exports = router;

