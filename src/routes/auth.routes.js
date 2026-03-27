const express = require('express');
const AuthController = require('../controllers/auth.controller');
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
router.put('/change-password', authenticate, AuthController.changePassword);
router.post('/logout', authenticate, AuthController.logout);

module.exports = router;
