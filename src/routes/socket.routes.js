/**
 * QUICK START - Socket.IO Integration
 * 
 * Ví dụ nhanh để test Socket.IO
 */

const express = require('express');
const router = express.Router();
const socketManager = require('../config/socket');
const authMiddleware = require('../middlewares/auth.middleware');

// ============================================
// TEST SOCKET ENDPOINTS
// ============================================

/**
 * GET /api/v1/socket/test
 * Test gửi notification đến chính mình
 */
router.get('/test', authMiddleware.authenticate, (req, res) => {
  const userId = req.user.id;

  socketManager.emitToUser(userId, 'test-notification', {
    message: 'Hello from socket!',
    timestamp: new Date().toISOString()
  });

  res.json({
    status: 'success',
    message: 'Check your socket connection for the notification',
    userId
  });
});

/**
 * POST /api/v1/socket/send
 * Gửi notification đến một user khác
 * Body: { userId, message }
 */
router.post('/send', authMiddleware.authenticate, (req, res) => {
  const { userId, message } = req.body;

  if (!userId || !message) {
    return res.status(400).json({
      status: 'error',
      message: 'userId and message are required'
    });
  }

  const success = socketManager.emitToUser(userId, 'notification', {
    from: req.user.id,
    message,
    timestamp: new Date().toISOString()
  });

  res.json({
    status: success ? 'success' : 'error',
    message: success ? 'Notification sent' : 'User is not online',
    isOnline: success
  });
});

/**
 * POST /api/v1/socket/broadcast
 * Broadcast message đến tất cả users
 * Body: { message }
 */
router.post('/broadcast', 
  authMiddleware.authenticate,
  authMiddleware.authorizeRole('admin'),
  (req, res) => {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        status: 'error',
        message: 'message is required'
      });
    }

    socketManager.broadcast('announcement', {
      from: 'System',
      message,
      timestamp: new Date().toISOString()
    });

    res.json({
      status: 'success',
      message: 'Announcement broadcasted',
      onlineUsers: socketManager.getOnlineCount()
    });
  }
);

/**
 * GET /api/v1/socket/online
 * Lấy danh sách users đang online
 */
router.get('/online', authMiddleware.authenticate, (req, res) => {
  const onlineUsers = socketManager.getOnlineUsers();
  const onlineCount = socketManager.getOnlineCount();

  res.json({
    status: 'success',
    data: {
      users: onlineUsers,
      count: onlineCount
    }
  });
});

/**
 * GET /api/v1/socket/status/:userId
 * Kiểm tra status của một user
 */
router.get('/status/:userId', authMiddleware.authenticate, (req, res) => {
  const { userId } = req.params;
  const isOnline = socketManager.isUserOnline(userId);

  res.json({
    status: 'success',
    data: {
      userId,
      isOnline,
      timestamp: new Date().toISOString()
    }
  });
});

/**
 * POST /api/v1/socket/room/join
 * Join một room
 * Body: { roomId }
 */
router.post('/room/join', authMiddleware.authenticate, (req, res) => {
  const { roomId } = req.body;
  const userId = req.user.id;

  if (!roomId) {
    return res.status(400).json({
      status: 'error',
      message: 'roomId is required'
    });
  }

  // Client sẽ tự emit 'join-room' event
  // Đây chỉ là API endpoint để track việc join room

  res.json({
    status: 'success',
    message: `User ${userId} can join room ${roomId}`,
    instruction: 'Client should emit "join-room" event with roomId'
  });
});

/**
 * POST /api/v1/socket/room/message
 * Gửi message vào room
 * Body: { roomId, message }
 */
router.post('/room/message', authMiddleware.authenticate, (req, res) => {
  const { roomId, message } = req.body;
  const userId = req.user.id;

  if (!roomId || !message) {
    return res.status(400).json({
      status: 'error',
      message: 'roomId and message are required'
    });
  }

  socketManager.emitToRoom(roomId, 'room-message', {
    roomId,
    senderId: userId,
    senderEmail: req.user.email,
    message,
    timestamp: new Date().toISOString()
  });

  res.json({
    status: 'success',
    message: 'Message sent to room'
  });
});

module.exports = router;
