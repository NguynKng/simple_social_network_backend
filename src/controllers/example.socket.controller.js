const socketManager = require('../config/socket');

class NotificationController {
  async sendNotification(req, res) {
    try {
      const { userId, message, type } = req.body;

      socketManager.emitToUser(userId, 'notification', {
        message,
        type,
        timestamp: new Date().toISOString()
      });

      res.json({
        status: 'success',
        message: 'Notification sent'
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async broadcastAnnouncement(req, res) {
    try {
      const { message } = req.body;

      socketManager.broadcast('announcement', {
        message,
        timestamp: new Date().toISOString()
      });

      res.json({
        status: 'success',
        message: 'Announcement broadcasted'
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

class PostController {
  /**
   * Tạo post mới và thông báo cho followers
   */
  async createPost(req, res) {
    try {
      const { content } = req.body;
      const authorId = req.user.id;

      // Lưu post vào database
      // const post = await Post.create({ authorId, content });

      // Lấy danh sách followers
      // const followers = await User.find({ following: authorId });

      // Giả sử có followers
      const followers = ['user1', 'user2', 'user3'];

      // Gửi thông báo realtime cho từng follower
      followers.forEach(followerId => {
        socketManager.emitToUser(followerId, 'new-post', {
          authorId,
          // postId: post._id,
          content,
          message: 'Có bài viết mới từ người bạn theo dõi'
        });
      });

      res.json({
        status: 'success',
        message: 'Post created and notifications sent'
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Like post và thông báo cho tác giả
   */
  async likePost(req, res) {
    try {
      const { postId } = req.params;
      const userId = req.user.id;

      // Lưu like vào database
      // const post = await Post.findById(postId);
      // await Like.create({ postId, userId });

      // Giả sử lấy được authorId của post
      const authorId = 'post-author-id';

      // Thông báo cho tác giả (trừ khi like chính post của mình)
      if (authorId !== userId) {
        socketManager.emitToUser(authorId, 'post-liked', {
          postId,
          userId,
          userName: req.user.email, // hoặc lấy từ database
          message: 'đã thích bài viết của bạn'
        });
      }

      res.json({
        status: 'success',
        message: 'Post liked'
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

// ============================================
// 3. SỬ DỤNG TRONG CHAT/MESSAGE CONTROLLER
// ============================================

class MessageController {
  /**
   * Gửi tin nhắn realtime
   */
  async sendMessage(req, res) {
    try {
      const { receiverId, content } = req.body;
      const senderId = req.user.id;

      // Lưu message vào database
      // const message = await Message.create({ senderId, receiverId, content });

      // Gửi message realtime cho receiver
      socketManager.emitToUser(receiverId, 'new-message', {
        // messageId: message._id,
        senderId,
        senderEmail: req.user.email,
        content,
        timestamp: new Date().toISOString()
      });

      // Optional: Gửi confirmation cho sender
      socketManager.emitToUser(senderId, 'message-sent', {
        // messageId: message._id,
        receiverId,
        status: 'delivered'
      });

      res.json({
        status: 'success',
        message: 'Message sent'
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Gửi tin nhắn trong group/room
   */
  async sendRoomMessage(req, res) {
    try {
      const { roomId, content } = req.body;
      const senderId = req.user.id;

      // Lưu message vào database
      // const message = await Message.create({ roomId, senderId, content });

      // Broadcast message cho tất cả trong room (trừ sender)
      const socketId = socketManager.connectedUsers.get(senderId);
      if (socketId) {
        const io = socketManager.getIO();
        io.to(roomId).except(socketId).emit('room-message', {
          roomId,
          senderId,
          senderEmail: req.user.email,
          content,
          timestamp: new Date().toISOString()
        });
      }

      res.json({
        status: 'success',
        message: 'Room message sent'
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

// ============================================
// 4. SỬ DỤNG TRONG SERVICE/UTILITY
// ============================================

class NotificationService {
  /**
   * Send notification khi có comment mới
   */
  static async notifyNewComment(postId, postAuthorId, commentAuthorId, content) {
    if (postAuthorId === commentAuthorId) return; // Không thông báo nếu comment chính post của mình

    socketManager.emitToUser(postAuthorId, 'new-comment', {
      postId,
      commentAuthorId,
      content,
      message: 'đã bình luận về bài viết của bạn'
    });
  }

  /**
   * Send notification khi được mention
   */
  static async notifyMention(mentionedUserId, postId, authorId, content) {
    socketManager.emitToUser(mentionedUserId, 'mentioned', {
      postId,
      authorId,
      content,
      message: 'đã nhắc đến bạn trong một bài viết'
    });
  }

  /**
   * Broadcast system maintenance notification
   */
  static async notifyMaintenance(message, scheduledTime) {
    socketManager.broadcast('system-maintenance', {
      message,
      scheduledTime,
      type: 'warning'
    });
  }
}

// ============================================
// 5. KIỂM TRA USER ONLINE STATUS
// ============================================

class UserController {
  /**
   * Kiểm tra user có online không
   */
  async checkUserStatus(req, res) {
    try {
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
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Lấy danh sách users đang online
   */
  async getOnlineUsers(req, res) {
    try {
      const onlineUsers = socketManager.getOnlineUsers();
      const onlineCount = socketManager.getOnlineCount();

      res.json({
        status: 'success',
        data: {
          users: onlineUsers,
          count: onlineCount
        }
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

// ============================================
// 6. ADMIN: QUẢN LÝ CONNECTIONS
// ============================================

class AdminController {
  /**
   * Ngắt kết nối của một user (kick)
   */
  async disconnectUser(req, res) {
    try {
      const { userId } = req.params;

      const success = socketManager.disconnectUser(userId);

      res.json({
        status: success ? 'success' : 'error',
        message: success ? 'User disconnected' : 'User not found or not connected'
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Lấy thống kê connections
   */
  async getConnectionStats(req, res) {
    try {
      const onlineCount = socketManager.getOnlineCount();
      const onlineUsers = socketManager.getOnlineUsers();

      res.json({
        status: 'success',
        data: {
          totalConnections: onlineCount,
          users: onlineUsers,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

// ============================================
// EXPORT
// ============================================

module.exports = {
  NotificationController,
  PostController,
  MessageController,
  NotificationService,
  UserController,
  AdminController
};
