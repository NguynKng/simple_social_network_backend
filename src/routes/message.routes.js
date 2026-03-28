const express = require("express");
const MessageController = require("../controllers/message.controller");
const { authenticate } = require("../middlewares/auth.middleware");
const { uploadChatImagesMiddleware } = require("../middlewares/upload.middleware");

const router = express.Router();

router.post("/send", authenticate, uploadChatImagesMiddleware, MessageController.sendMessage);
router.get("/history/:chatId", authenticate, MessageController.getHistoryChat);

module.exports = router;