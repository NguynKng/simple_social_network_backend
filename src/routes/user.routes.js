const express = require('express');
const UserController = require('../controllers/user.controller');
const { authenticate } = require('../middlewares/auth.middleware');

const router = express.Router();

/**
 * User routes — Base: /api/:version/users
 */
router.get('/search', UserController.searchUsers);
router.get('/:slug', UserController.getUserProfileBySlug);

module.exports = router;
