const Message = require("../models/message");
const Listing = require("../models/list");
const User = require("../models/user");
const Notification = require("../models/notification");

// 1. GET /messages - Inbox of active conversations
module.exports.renderInbox = async (req, res) => {
    // Find all messages involving current user
    const messages = await Message.find({
        $or: [{ sender: req.user._id }, { recipient: req.user._id }]
    })
    .populate("sender", "username email avatar")
    .populate("recipient", "username email avatar")
    .populate("listing", "title location image")
    .sort({ createdAt: -1 });

    // Group into distinct conversation threads
    const conversationsMap = new Map();

    messages.forEach(msg => {
        const otherUser = msg.sender._id.equals(req.user._id) ? msg.recipient : msg.sender;
        const listingId = msg.listing ? msg.listing._id.toString() : "general";
        const key = `${otherUser._id}_${listingId}`;

        if (!conversationsMap.has(key)) {
            conversationsMap.set(key, {
                otherUser,
                listing: msg.listing,
                lastMessage: msg,
                unreadCount: (!msg.isRead && msg.recipient._id.equals(req.user._id)) ? 1 : 0
            });
        }
    });

    const conversations = Array.from(conversationsMap.values());

    if (req.xhr || req.headers.accept?.includes("application/json")) {
        return res.json({ success: true, count: conversations.length, conversations });
    }

    res.render("messages/index.ejs", {
        conversations,
        pageTitle: "Guest & Host Messages"
    });
};

// 2. GET /messages/thread - Conversation thread between two users
module.exports.renderThread = async (req, res) => {
    const { listingId, userId } = req.query;

    if (!userId) {
        req.flash("error", "Invalid conversation partner.");
        return res.redirect("/messages");
    }

    const otherUser = await User.findById(userId);
    if (!otherUser) {
        req.flash("error", "User not found.");
        return res.redirect("/messages");
    }

    const listing = listingId ? await Listing.findById(listingId) : null;

    // Mark all incoming messages from otherUser as read
    await Message.updateMany(
        { sender: otherUser._id, recipient: req.user._id, isRead: false },
        { $set: { isRead: true } }
    );

    // Fetch conversation history
    const threadQuery = {
        $or: [
            { sender: req.user._id, recipient: otherUser._id },
            { sender: otherUser._id, recipient: req.user._id }
        ]
    };
    if (listingId) {
        threadQuery.listing = listingId;
    }

    const messages = await Message.find(threadQuery)
        .populate("sender", "username avatar")
        .sort({ createdAt: 1 });

    res.render("messages/thread.ejs", {
        otherUser,
        listing,
        messages,
        pageTitle: `Conversation with ${otherUser.username}`
    });
};

// 3. POST /messages - Send a message
module.exports.sendMessage = async (req, res) => {
    const { listingId, recipientId, content } = req.body;

    if (!recipientId || !content || !content.trim()) {
        const msg = "Message content cannot be blank.";
        if (req.xhr || req.headers.accept?.includes("application/json")) {
            return res.status(400).json({ success: false, message: msg });
        }
        req.flash("error", msg);
        return res.redirect("/messages");
    }

    const newMessage = new Message({
        listing: listingId || null,
        sender: req.user._id,
        recipient: recipientId,
        content: content.trim()
    });

    await newMessage.save();

    // Trigger Notification for recipient (Feature 4)
    await Notification.create({
        user: recipientId,
        sender: req.user._id,
        title: "New Message Received",
        message: `${req.user.username}: "${content.trim().slice(0, 50)}..."`,
        type: "message_received",
        link: `/messages/thread?${listingId ? `listingId=${listingId}&` : ''}userId=${req.user._id}`
    }).catch(() => {});

    if (req.xhr || req.headers.accept?.includes("application/json")) {
        return res.status(201).json({
            success: true,
            message: "Message delivered successfully!",
            messageDoc: newMessage
        });
    }

    req.flash("success", "Message sent!");
    res.redirect(`/messages/thread?${listingId ? `listingId=${listingId}&` : ''}userId=${recipientId}`);
};

