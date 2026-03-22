const UserService = require('../services/user.service');

const userService = new UserService();

/**
 * UserController — HTTP handlers cho tài nguyên User
 */
class UserController {
  /**
   * GET /api/:version/users/:id
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
