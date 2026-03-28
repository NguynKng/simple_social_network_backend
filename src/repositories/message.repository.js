const Message = require("../models/Message.model");

class MessageRepository {
  async createMessage(data) {
    const message = await Message.create(data);

    return Message.findById(message._id)
      .populate("sender", "fullName avatar slug")
      .lean();
  }

  async getHistoryByChat(chatId, options = {}) {
    const page = Math.max(Number(options.page) || 1, 1);
    const limit = Math.min(Math.max(Number(options.limit) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const query = { chatId };

    const [data, total] = await Promise.all([
      Message.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("sender", "fullName avatar slug")
        .lean(),
      Message.countDocuments(query),
    ]);

    const pages = Math.ceil(total / limit);

    return {
      data: data.reverse(),
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
}

module.exports = MessageRepository;