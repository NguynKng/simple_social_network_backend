const ChatRepository = require("../repositories/chat.repository");
const UserRepository = require("../repositories/user.repository");
const { BadRequestError, NotFoundError } = require("../utils/errors");
const { isValidObjectId } = require("../utils/database.util");

class ChatService {
  constructor() {
    this.chatRepository = new ChatRepository();
    this.userRepository = new UserRepository();
  }

  async getChatByUserId(currentUserId, targetUserId) {
    if (!currentUserId || !targetUserId) {
      throw new BadRequestError("Thiếu currentUserId hoặc targetUserId");
    }

    if (!isValidObjectId(currentUserId) || !isValidObjectId(targetUserId)) {
      throw new BadRequestError("ID người dùng không hợp lệ");
    }

    if (String(currentUserId) === String(targetUserId)) {
      throw new BadRequestError("Không thể tạo chat với chính mình");
    }

    const targetUser = await this.userRepository.findById(targetUserId, {
      select: "_id isActive",
    });

    if (!targetUser || targetUser.isActive === false) {
      throw new NotFoundError("Người dùng không tồn tại");
    }

    let chat = await this.chatRepository.findPrivateChatBetweenUsers(
      currentUserId,
      targetUserId,
    );

    if (!chat) {
      chat = await this.chatRepository.createPrivateChat(
        currentUserId,
        targetUserId,
      );
    }

    return {
      success: true,
      status: 200,
      message: "Lấy chat theo userId thành công",
      data: chat,
    };
  }

  async getRecentChat(currentUserId, options = {}) {
    if (!currentUserId) {
      throw new BadRequestError("Thiếu thông tin người dùng");
    }

    if (!isValidObjectId(currentUserId)) {
      throw new BadRequestError("currentUserId không hợp lệ");
    }

    const result = await this.chatRepository.getRecentChats(currentUserId, options);

    return {
      success: true,
      status: 200,
      message: "Lấy danh sách chat gần đây thành công",
      data: result.data,
      pagination: result.pagination,
    };
  }
}

module.exports = ChatService;