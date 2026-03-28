const UserService = require('../services/user.service');

const userService = new UserService();

class UserController {
  static async setAvatar(req, res, next) {
    try {
      const userId = req.body.userId || req.user?.id || req.user?.userId;
      const result = await userService.setAvatar(userId, req.file);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async setCoverPhoto(req, res, next) {
    try {
      const userId = req.body.userId || req.user?.id || req.user?.userId;
      const result = await userService.setCoverPhoto(userId, req.file);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async sendFriendRequest(req, res, next) {
    try {
      const senderId = req.user?.id || req.user?.userId;
      const targetUserId = req.params.targetUserId || req.params.userId;
      const result = await userService.sendFriendRequest(senderId, targetUserId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async cancelFriendRequest(req, res, next) {
    try {
      const senderId = req.user?.id || req.user?.userId;
      const targetUserId = req.params.targetUserId || req.params.userId;
      const result = await userService.cancelFriendRequest(senderId, targetUserId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async acceptFriendRequest(req, res, next) {
    try {
      const userId = req.user?.id || req.user?.userId;
      const requesterId = req.params.requesterId || req.params.userId;
      const result = await userService.acceptFriendRequest(userId, requesterId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async rejectFriendRequest(req, res, next) {
    try {
      const userId = req.user?.id || req.user?.userId;
      const requesterId = req.params.requesterId || req.params.userId;
      const result = await userService.rejectFriendRequest(userId, requesterId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async unfriend(req, res, next) {
    try {
      const userId = req.user?.id || req.user?.userId;
      const friendId = req.params.friendId || req.params.userId;
      const result = await userService.unfriend(userId, friendId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async searchUsers(req, res, next) {
    try {
      const { q, page = 1, limit = 10 } = req.query;
      const result = await userService.searchUsers(q, {
        page: Number(page) || 1,
        limit: Math.min(Number(limit) || 10, 50),
        select: '-_id fullName avatar slug',
        sort: { fullName: 1 },
      });
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async getUserProfileBySlug(req, res, next) {
    try {
      const { slug } = req.params;
      const result = await userService.getUserProfileBySlug(slug);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = UserController;
