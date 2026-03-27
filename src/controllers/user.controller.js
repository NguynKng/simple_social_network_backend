const UserService = require('../services/user.service');
const { isValidObjectId } = require('../utils/database.util');

const userService = new UserService();

/**
 * UserController — HTTP handlers cho tài nguyên User
 */
class UserController {
  /**
   * GET /api/:version/users/:slug
   */
  static async getUserBySlug(req, res, next) {
    try {
      const { slug } = req.params;
      const result = isValidObjectId(slug)
        ? await userService.getUserById(slug)
        : await userService.getUserBySlug(slug);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/:version/users/:id
   * Lưu lại để tương thích ngược (nếu hệ thống cũ vẫn gọi theo id).
   */
  static async getUserById(req, res, next) {
    try {
      const { id } = req.params;
      const result = await userService.getUserById(id);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = UserController;
