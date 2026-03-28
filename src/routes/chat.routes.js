const express = require("express");
const ChatController = require("../controllers/chat.controller");
const { authenticate } = require("../middlewares/auth.middleware");

const router = express.Router();

router.get("/recent", authenticate, ChatController.getRecentChat);
router.get("/user/:userId", authenticate, ChatController.getChatByUserId);

module.exports = router;