const express = require('express');
const AuthController = require('../controllers/AuthController');
const { authenticate } = require('../middlewares/auth.middleware');

const router = express.Router();

/**
 * Authentication Routes
 * Base path: /api/auth
 */

// Public routes
router.post('/register', AuthController.register);
router.post('/verify-email', AuthController.verifyEmail);
router.post('/resend-verification', AuthController.resendVerification);
router.post('/login', AuthController.login);
router.post('/verify', AuthController.verifyToken);

// Protected routes (require authentication)
router.get('/profile', authenticate, AuthController.getProfile);
router.put('/profile', authenticate, AuthController.updateProfile);
router.put('/change-password', authenticate, AuthController.changePassword);
router.post('/refresh', authenticate, AuthController.refreshToken);
router.post('/logout', authenticate, AuthController.logout);

module.exports = router;
