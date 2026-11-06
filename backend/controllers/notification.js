const Notification = require("../models/notification");

// GET /notifications - User notifications feed
module.exports.renderNotifications = async (req, res) => {
    const notifications = await Notification.find({ user: req.user._id })
        .populate("sender", "username avatar")
        .sort({ createdAt: -1 });

    const unreadCount = notifications.filter(n => !n.isRead).length;

    if (req.xhr || req.headers.accept?.includes("application/json")) {
        return res.json({
            success: true,
            unreadCount,
            notifications
        });
    }

    res.render("notifications/index.ejs", {
        notifications,
        unreadCount,
        pageTitle: "Notifications & Alerts"
    });
};

// PATCH /notifications/:id/read - Mark single as read
module.exports.markAsRead = async (req, res) => {
    const { id } = req.params;
    await Notification.findOneAndUpdate(
        { _id: id, user: req.user._id },
        { $set: { isRead: true } }
    );

    if (req.xhr || req.headers.accept?.includes("application/json")) {
        return res.json({ success: true, message: "Marked as read." });
    }

    res.redirect("/notifications");
};

// PATCH /notifications/read-all - Mark all as read
module.exports.markAllAsRead = async (req, res) => {
    await Notification.updateMany(
        { user: req.user._id, isRead: false },
        { $set: { isRead: true } }
    );

    if (req.xhr || req.headers.accept?.includes("application/json")) {
        return res.json({ success: true, message: "All notifications marked as read." });
    }

    req.flash("success", "All notifications marked as read.");
    res.redirect("/notifications");
};

// DELETE /notifications/:id - Delete single notification
module.exports.deleteNotification = async (req, res) => {
    const { id } = req.params;
    await Notification.findOneAndDelete({ _id: id, user: req.user._id });

    if (req.xhr || req.headers.accept?.includes("application/json")) {
        return res.json({ success: true, message: "Notification deleted." });
    }

    res.redirect("/notifications");
};

