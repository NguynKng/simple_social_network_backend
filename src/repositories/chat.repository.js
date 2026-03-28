const Chat = require("../models/Chat.model");

class ChatRepository {
  async findPrivateChatBetweenUsers(userId, targetUserId) {
    return Chat.findOne({
      type: "private",
      participants: { $all: [userId, targetUserId], $size: 2 },
    })
      .populate("participants", "fullName avatar slug")
      .populate({ path: "lastMessage", populate: { path: "sender", select: "fullName avatar slug" } });
  }

  async createPrivateChat(userId, targetUserId) {
    const chat = await Chat.create({
      type: "private",
      participants: [userId, targetUserId],
      createdBy: userId,
    });

    return Chat.findById(chat._id)
      .populate("participants", "fullName avatar slug")
      .populate({ path: "lastMessage", populate: { path: "sender", select: "fullName avatar slug" } });
  }

  async findByIdForUser(chatId, userId) {
    return Chat.findOne({
      _id: chatId,
      participants: userId,
    })
      .populate("participants", "fullName avatar slug")
      .populate({ path: "lastMessage", populate: { path: "sender", select: "fullName avatar slug" } });
  }

  async getRecentChats(userId, options = {}) {
    const page = Math.max(Number(options.page) || 1, 1);
    const limit = Math.min(Math.max(Number(options.limit) || 20, 1), 50);
    const skip = (page - 1) * limit;

    const query = {
      participants: userId,
      type: "private",
    };

    const [data, total] = await Promise.all([
      Chat.find(query)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("participants", "fullName avatar slug")
        .populate({ path: "lastMessage", populate: { path: "sender", select: "fullName avatar slug" } })
        .lean(),
      Chat.countDocuments(query),
    ]);

    const pages = Math.ceil(total / limit);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        pages,
        hasNextPage: page < pages,
        hasPrevPage: page > 1,
      },
    };
  }

  async updateLastMessage(chatId, messageId) {
    return Chat.findByIdAndUpdate(
      chatId,
      {
        lastMessage: messageId,
        updatedAt: new Date(),
      },
      { new: true },
    );
  }
}

module.exports = ChatRepository;