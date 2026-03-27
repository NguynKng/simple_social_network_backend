const express = require('express');
const UserController = require('../controllers/user.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const {
	uploadAvatarMiddleware,
	uploadCoverPhotoMiddleware,
} = require('../middlewares/upload.middleware');

const router = express.Router();

/**
 * User routes — Base: /api/:version/users
 */
router.put('/avatar', authenticate, uploadAvatarMiddleware, UserController.setAvatar);
router.put('/cover-photo', authenticate, uploadCoverPhotoMiddleware, UserController.setCoverPhoto);
router.get('/search', UserController.searchUsers);
router.get('/:slug', UserController.getUserProfileBySlug);

module.exports = router;
