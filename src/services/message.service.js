const ChatRepository = require("../repositories/chat.repository");
const MessageRepository = require("../repositories/message.repository");
const { uploadToCloudinary } = require("../utils/cloudinary");
const socketManager = require("../config/socket");
const { BadRequestError, NotFoundError } = require("../utils/errors");
const { isValidObjectId } = require("../utils/database.util");

class MessageService {
  constructor() {
    this.chatRepository = new ChatRepository();
    this.messageRepository = new MessageRepository();
  }

  async sendMessage(senderId, payload = {}, files = []) {
    if (!senderId || !isValidObjectId(senderId)) {
      throw new BadRequestError("senderId không hợp lệ");
    }

    const { chatId, receiverId, text = "", media = [] } = payload;

    let targetChat = null;

    if (chatId) {
      if (!isValidObjectId(chatId)) {
        throw new BadRequestError("chatId không hợp lệ");
      }

      targetChat = await this.chatRepository.findByIdForUser(chatId, senderId);
      if (!targetChat) {
        throw new NotFoundError("Không tìm thấy cuộc trò chuyện");
      }
    } else {
      if (!receiverId || !isValidObjectId(receiverId)) {
        throw new BadRequestError("receiverId không hợp lệ");
      }

      if (String(receiverId) === String(senderId)) {
        throw new BadRequestError("Không thể gửi tin nhắn cho chính mình");
      }

      targetChat = await this.chatRepository.findPrivateChatBetweenUsers(
        senderId,
        receiverId,
      );

      if (!targetChat) {
        targetChat = await this.chatRepository.createPrivateChat(senderId, receiverId);
      }
    }

    const uploadedMedia = await Promise.all(
      (Array.isArray(files) ? files : []).map(async (file) => {
        const result = await uploadToCloudinary(file.buffer, "message");
        return result.public_id;
      }),
    );

    const mediaPaths = [
      ...(Array.isArray(media) ? media : []),
      ...uploadedMedia,
    ].filter(Boolean);

    const trimmedText = typeof text === "string" ? text.trim() : "";

    if (!trimmedText && mediaPaths.length === 0) {
      throw new BadRequestError("Tin nhắn phải có text hoặc ảnh");
    }

    const newMessage = await this.messageRepository.createMessage({
      chatId: targetChat._id,
      sender: senderId,
      text: trimmedText,
      media: mediaPaths,
    });

    await this.chatRepository.updateLastMessage(targetChat._id, newMessage._id);

    const fullChat = await this.chatRepository.findByIdForUser(
      targetChat._id,
      senderId,
    );

    const participants = Array.isArray(fullChat?.participants)
      ? fullChat.participants
      : [];

    participants.forEach((participant) => {
      const participantId =
        typeof participant === "object" && participant._id
          ? String(participant._id)
          : String(participant);

      if (participantId !== String(senderId)) {
        socketManager.emitToUser(participantId, "getNewMessage", {
          chat: fullChat,
        });
      }

      socketManager.emitToUser(participantId, "receiveMessage", newMessage);
      socketManager.emitToUser(participantId, "newMessage", {
        chat: fullChat,
      });
    });

    const recipients = participants
      .map((participant) =>
        typeof participant === "object" && participant._id
          ? String(participant._id)
          : String(participant),
      )
      .filter((id) => id !== String(senderId));

    return {
      success: true,
      status: 201,
      message: "Gửi tin nhắn thành công",
      data: newMessage,
      recipients,
    };
  }

  async getHistoryChat(currentUserId, chatId, options = {}) {
    if (!currentUserId || !isValidObjectId(currentUserId)) {
      throw new BadRequestError("currentUserId không hợp lệ");
    }

    if (!chatId || !isValidObjectId(chatId)) {
      throw new BadRequestError("chatId không hợp lệ");
    }

    const chat = await this.chatRepository.findByIdForUser(chatId, currentUserId);
    if (!chat) {
      throw new NotFoundError("Không tìm thấy cuộc trò chuyện");
    }

    const result = await this.messageRepository.getHistoryByChat(chatId, options);

    return {
      success: true,
      status: 200,
      message: "Lấy lịch sử chat thành công",
      data: result.data,
      pagination: result.pagination,
    };
  }
}

module.exports = MessageService;