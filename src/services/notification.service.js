const NotificationRepository = require("../repositories/notification.repository");
const UserRepository = require("../repositories/user.repository");
const { BadRequestError } = require("../utils/errors");
const { isValidObjectId } = require("../utils/database.util");
const socketManager = require("../config/socket");

class NotificationService {
  constructor() {
    this.notificationRepository = new NotificationRepository();
    this.userRepository = new UserRepository();
  }

  getNotificationContent(type = "system", fallbackMessage = "") {
    if (
      fallbackMessage &&
      typeof fallbackMessage === "string" &&
      fallbackMessage.trim()
    ) {
      return fallbackMessage.trim();
    }

    switch (type) {
      case "new_post":
        return "posted a new status.";
      case "react_post":
        return "reacted to your post.";
      case "comment_post":
        return "commented on your post.";
      case "reply_comment":
        return "replied to your comment.";
      case "friend_request":
        return "sent you a friend request.";
      case "accepted_request":
        return "accepted your friend request.";
      default:
        return "sent you a notification.";
    }
  }

  async getNotifications(userId, options = {}) {
    if (!userId) {
      throw new BadRequestError("Thiếu thông tin người dùng");
    }

    if (!isValidObjectId(userId)) {
      throw new BadRequestError("userId không hợp lệ");
    }

    const { data, pagination } = await this.notificationRepository.findByUser(
      userId,
      {
        page: options.page,
        limit: options.limit,
        isRead: options.isRead,
      },
    );

    const unreadCount =
      await this.notificationRepository.countUnreadByUser(userId);

    return {
      success: true,
      status: 200,
      message: "Lấy danh sách thông báo thành công",
      data: {
        notifications: data,
        pagination,
        unreadCount,
      },
    };
  }

  async markAsAllRead(userId) {
    if (!userId) {
      throw new BadRequestError("Thiếu thông tin người dùng");
    }

    if (!isValidObjectId(userId)) {
      throw new BadRequestError("userId không hợp lệ");
    }

    const { modifiedCount } =
      await this.notificationRepository.markAllAsRead(userId);

    return {
      success: true,
      status: 200,
      message: "Đã đánh dấu tất cả thông báo là đã đọc",
      data: {
        modifiedCount,
      },
    };
  }

  async sendNotification(userIds, actorId, type, data = {}) {
    if (!userIds) {
      return [];
    }

    if (!actorId || !isValidObjectId(actorId)) {
      throw new BadRequestError("actorId không hợp lệ");
    }

    const receivers = Array.isArray(userIds) ? userIds : [userIds];
    const normalizedReceivers = Array.from(
      new Set(
        receivers.filter((id) => isValidObjectId(id)).map((id) => String(id)),
      ),
    );

    if (normalizedReceivers.length === 0) {
      return [];
    }

    const actor = await this.userRepository.findById(actorId, {
      select: "fullName avatar slug",
    });

    if (!actor) {
      throw new BadRequestError("Actor không tồn tại");
    }

    const content = this.getNotificationContent(type);

    const docs = normalizedReceivers.map((uid) => ({
      user: uid,
      actor: actorId,
      type,
      content,
      data,
    }));

    const inserted = await this.notificationRepository.createMany(docs);
    const notifications = await this.notificationRepository.findByIds(
      inserted.map((item) => item._id),
    );

    notifications.forEach((notification) => {
      socketManager.emitToUser(String(notification.user), "new_notification", {
        notification,
      });
    });

    return notifications;
  }

  async sendNotificationToFriends(actorId, type, data = {}) {
    if (!actorId || !isValidObjectId(actorId)) {
      throw new BadRequestError("actorId không hợp lệ");
    }

    const user = await this.userRepository.findById(actorId, {
      select: "friends",
    });

    if (!user) {
      throw new BadRequestError("User không tồn tại");
    }

    const friendIds = Array.isArray(user.friends)
      ? user.friends
          .map((id) => String(id))
          .filter((id) => id !== String(actorId))
      : [];

    return this.sendNotification(friendIds, actorId, type, data);
  }
}

module.exports = NotificationService;
