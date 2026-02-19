const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const config = require('../config/envVars');

/**
 * Middleware xác thực người dùng thông qua JWT token
 * Kiểm tra token trong header Authorization
 * Nếu hợp lệ, gắn thông tin user vào req.user
 */
class AuthMiddleware {
  /**
   * Middleware kiểm tra token và xác thực user
   */
  authenticate(req, res, next) {
    try {
      // Lấy token từ header Authorization
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          status: 'error',
          message: 'Không tìm thấy token xác thực'
        });
      }

      // Tách token từ "Bearer <token>"
      const token = authHeader.split(' ')[1];

      if (!token) {
        return res.status(401).json({
          status: 'error',
          message: 'Token không hợp lệ'
        });
      }

      // Verify token
      const JWT_SECRET = config.JWT_SECRET || 'your-secret-key';
      const decoded = jwt.verify(token, JWT_SECRET);

      // Gắn thông tin user vào request
      req.user = {
        id: decoded.id || decoded.userId,
        email: decoded.email,
        role: decoded.role
      };

      logger.info(`User authenticated: ${req.user.id}`);
      next();
    } catch (error) {
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          status: 'error',
          message: 'Token không hợp lệ'
        });
      }

      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          status: 'error',
          message: 'Token đã hết hạn'
        });
      }

      logger.error('Authentication error:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Lỗi xác thực'
      });
    }
  }

  /**
   * Middleware kiểm tra user có quyền truy cập resource của chính họ
   * So sánh userId trong params với userId trong token
   * @param {string} paramName - Tên của param chứa userId (mặc định: 'userId')
   */
  authorizeOwner(paramName = 'userId') {
    return (req, res, next) => {
      try {
        // Kiểm tra xem đã authenticate chưa
        if (!req.user || !req.user.id) {
          return res.status(401).json({
            status: 'error',
            message: 'Vui lòng đăng nhập'
          });
        }

        // Lấy userId từ params hoặc body
        const resourceUserId = req.params[paramName] || req.body[paramName];

        if (!resourceUserId) {
          return res.status(400).json({
            status: 'error',
            message: `Không tìm thấy ${paramName} trong request`
          });
        }

        // So sánh userId (chuyển về string để so sánh)
        if (req.user.id.toString() !== resourceUserId.toString()) {
          logger.warn(`Unauthorized access attempt: User ${req.user.id} tried to access resource of user ${resourceUserId}`);
          return res.status(403).json({
            status: 'error',
            message: 'Bạn không có quyền truy cập tài nguyên này'
          });
        }

        logger.info(`User ${req.user.id} authorized to access resource`);
        next();
      } catch (error) {
        logger.error('Authorization error:', error);
        return res.status(500).json({
          status: 'error',
          message: 'Lỗi phân quyền'
        });
      }
    };
  }

  /**
   * Middleware kiểm tra user có role cụ thể
   * @param {string[]} allowedRoles - Mảng các role được phép
   */
  authorizeRole(...allowedRoles) {
    return (req, res, next) => {
      try {
        // Kiểm tra xem đã authenticate chưa
        if (!req.user || !req.user.id) {
          return res.status(401).json({
            status: 'error',
            message: 'Vui lòng đăng nhập'
          });
        }

        // Kiểm tra role
        if (!allowedRoles.includes(req.user.role)) {
          logger.warn(`Unauthorized role access: User ${req.user.id} with role ${req.user.role} tried to access resource requiring roles: ${allowedRoles.join(', ')}`);
          return res.status(403).json({
            status: 'error',
            message: 'Bạn không có quyền truy cập'
          });
        }

        logger.info(`User ${req.user.id} with role ${req.user.role} authorized`);
        next();
      } catch (error) {
        logger.error('Role authorization error:', error);
        return res.status(500).json({
          status: 'error',
          message: 'Lỗi phân quyền'
        });
      }
    };
  }

  /**
   * Middleware cho phép user cập nhật resource của chính họ HOẶC admin có thể cập nhật bất kỳ
   * @param {string} paramName - Tên của param chứa userId
   */
  authorizeOwnerOrAdmin(paramName = 'userId') {
    return (req, res, next) => {
      try {
        // Kiểm tra xem đã authenticate chưa
        if (!req.user || !req.user.id) {
          return res.status(401).json({
            status: 'error',
            message: 'Vui lòng đăng nhập'
          });
        }

        // Nếu là admin thì cho phép
        if (req.user.role === 'admin') {
          logger.info(`Admin ${req.user.id} authorized to access resource`);
          return next();
        }

        // Lấy userId từ params hoặc body
        const resourceUserId = req.params[paramName] || req.body[paramName];

        if (!resourceUserId) {
          return res.status(400).json({
            status: 'error',
            message: `Không tìm thấy ${paramName} trong request`
          });
        }

        // So sánh userId
        if (req.user.id.toString() !== resourceUserId.toString()) {
          logger.warn(`Unauthorized access attempt: User ${req.user.id} tried to access resource of user ${resourceUserId}`);
          return res.status(403).json({
            status: 'error',
            message: 'Bạn không có quyền truy cập tài nguyên này'
          });
        }

        logger.info(`User ${req.user.id} authorized to access own resource`);
        next();
      } catch (error) {
        logger.error('Authorization error:', error);
        return res.status(500).json({
          status: 'error',
          message: 'Lỗi phân quyền'
          });
      }
    };
  }
}

module.exports = new AuthMiddleware();
