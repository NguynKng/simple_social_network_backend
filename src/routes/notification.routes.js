const express = require('express');
const NotificationController = require('../controllers/notification.controller');
const { authenticate } = require('../middlewares/auth.middleware');

const router = express.Router();

router.get('/', authenticate, NotificationController.getNotifications);
router.patch('/read-all', authenticate, NotificationController.markAsAllRead);

module.exports = router;