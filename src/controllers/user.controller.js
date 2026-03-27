const UserService = require('../services/user.service');

const userService = new UserService();

class UserController {
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
