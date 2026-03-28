const NotificationService = require('../services/notification.service');

const notificationService = new NotificationService();

class NotificationController {
  static async sendNotification(req, res, next) {
    try {
      const senderId = req.user?.id || req.user?.userId;
      const result = await notificationService.sendNotification(senderId, req.body || {});
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async getNotifications(req, res, next) {
    try {
      const userId = req.user?.id || req.user?.userId;
      const { page = 1, limit = 20, isRead } = req.query;

      const parsedIsRead =
        isRead === 'true' ? true : isRead === 'false' ? false : undefined;

      const result = await notificationService.getNotifications(userId, {
        page: Number(page) || 1,
        limit: Number(limit) || 20,
        isRead: parsedIsRead,
      });

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async markAsAllRead(req, res, next) {
    try {
      const userId = req.user?.id || req.user?.userId;
      const result = await notificationService.markAsAllRead(userId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = NotificationController;