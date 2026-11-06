const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync");
const { isLoggedIn } = require("../middleware");
const messageController = require("../controllers/message");

router.use(isLoggedIn);

router.get("/", wrapAsync(messageController.renderInbox));
router.get("/thread", wrapAsync(messageController.renderThread));
router.post("/", wrapAsync(messageController.sendMessage));

module.exports = router;

