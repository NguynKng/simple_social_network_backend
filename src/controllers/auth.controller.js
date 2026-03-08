const AuthService = require('../services/auth.service');
const logger = require('../utils/logger');

// Khai báo instance AuthService để tái sử dụng
const authService = new AuthService();

/**
 * AuthController - Handle authentication endpoints
 * Uses OOP pattern with static methods
 */
class AuthController {
  /**
   * Register a new user
   * POST /api/auth/register
   * @body {String} email - User email
   * @body {String} password - Password (min 6 characters)
   * @body {String} fullName - Full name
   * @body {String} [phoneNumber] - Phone number
   * @body {Date} [dateOfBirth] - Date of birth
   * @body {String} [gender] - Gender (male, female, other, prefer-not-to-say)
   */
  static async register(req, res, next) {
    try {
      const result = await authService.register(req.body);

      logger.info(`New user registered: ${req.body.email} - verification email sent`);

      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Verify email with verification token and OTP
   * POST /api/auth/verify-email
   * @body {String} verificationToken - JWT verification token from registration
   * @body {String} otp - 6-digit OTP from email
   */
  static async verifyEmail(req, res, next) {
    try {
      const { token, otp } = req.body;
      const result = await authService.verifyEmail(token, otp);

      logger.info(`User email verified successfully`);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Resend verification email
   * POST /api/auth/resend-verification
   * @body {String} email - User email
   */
  static async resendVerification(req, res, next) {
    try {
      const { email } = req.body;
      const result = await authService.resendVerificationEmail(email);

      logger.info(`Verification email resent to: ${email}`);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Login user
   * POST /api/auth/login
   * @body {String} identifier - Email or slug
   * @body {String} password - Password
   */
  static async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);

      logger.info(`User logged in: ${result.data.user.slug} (${result.data.user.email})`);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get current user profile
   * GET /api/auth/profile
   * @requires Authentication
   */
  static async getProfile(req, res, next) {
    try {
      const userId = req.user.userId;
      const result = await authService.getProfile(userId);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update current user profile
   * PUT /api/auth/profile
   * @requires Authentication
   * @body {String} [fullName] - Full name
   * @body {String} [bio] - User bio
   * @body {String} [avatar] - Avatar URL
   */
  static async updateProfile(req, res, next) {
    try {
      const userId = req.user.userId;
      const result = await authService.updateProfile(userId, req.body);

      logger.info(`User profile updated: ${result.data.slug}`);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Change password
   * PUT /api/auth/change-password
   * @requires Authentication
   * @body {String} currentPassword - Current password
   * @body {String} newPassword - New password
   */
  static async changePassword(req, res, next) {
    try {
      const userId = req.user.userId;
      const { currentPassword, newPassword } = req.body;
      
      const result = await authService.changePassword(userId, currentPassword, newPassword);

      logger.info(`User changed password: ${userId}`);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Refresh JWT token
   * POST /api/auth/refresh
   * @requires Authentication
   */
  static async refreshToken(req, res, next) {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      const result = await authService.refreshToken(token);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Logout user
   * POST /api/auth/logout
   * @requires Authentication
   */
  static async logout(req, res, next) {
    try {
      const userId = req.user.userId;
      const result = await authService.logout(userId);

      logger.info(`User logged out: ${userId}`);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Verify token
   * POST /api/auth/verify
   * @body {String} token - JWT token to verify
   */
  static async verifyToken(req, res, next) {
    try {
      const { token } = req.body;
      const result = await authService.verifyToken(token);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AuthController;
