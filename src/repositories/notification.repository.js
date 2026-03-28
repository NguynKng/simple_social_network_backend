const Notification = require('../models/Notification.model');
const { isValidObjectId } = require('../utils/database.util');

class NotificationRepository {
  async createMany(docs = []) {
    if (!Array.isArray(docs) || docs.length === 0) {
      return [];
    }

    return Notification.insertMany(docs);
  }

  async findByIds(ids = []) {
    if (!Array.isArray(ids) || ids.length === 0) {
      return [];
    }

    return Notification.find({ _id: { $in: ids } })
      .sort({ createdAt: -1 })
      .populate({ path: 'actor', select: 'fullName avatar slug' })
      .lean();
  }

  async findByUser(userId, options = {}) {
    if (!isValidObjectId(userId)) {
      return {
        data: [],
        pagination: {
          page: 1,
          limit: 0,
          total: 0,
          pages: 0,
          hasNextPage: false,
          hasPrevPage: false,
        },
      };
    }

    const page = Math.max(Number(options.page) || 1, 1);
    const limit = Math.min(Math.max(Number(options.limit) || 20, 1), 50);
    const skip = (page - 1) * limit;

    const query = {
      user: userId,
    };

    if (typeof options.isRead === 'boolean') {
      query.isRead = options.isRead;
    }

    const [data, total] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({ path: 'actor', select: 'fullName avatar slug' })
        .lean(),
      Notification.countDocuments(query),
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

  async countUnreadByUser(userId) {
    if (!isValidObjectId(userId)) {
      return 0;
    }

    return Notification.countDocuments({ user: userId, isRead: false });
  }

  async markAllAsRead(userId) {
    if (!isValidObjectId(userId)) {
      return { modifiedCount: 0 };
    }

    const result = await Notification.updateMany(
      { user: userId, isRead: false },
      { $set: { isRead: true } },
    );

    return {
      modifiedCount: result.modifiedCount || 0,
    };
  }
}

module.exports = NotificationRepository;