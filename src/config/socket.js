const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const config = require('./envVars');

class SocketManager {
  constructor() {
    if (SocketManager.instance) {
      return SocketManager.instance;
    }

    this.io = null;
    this.connectedUsers = new Map(); // Map<userId, socketId>
    this.userSockets = new Map(); // Map<socketId, userId>
    SocketManager.instance = this;
  }

  initialize(httpServer) {
    if (this.io) {
      logger.warn('Socket.IO already initialized');
      return this.io;
    }

    this.io = new Server(httpServer, {
      cors: {
        origin: config.CORS_ORIGIN || 'http://localhost:5173',
        credentials: true,
        methods: ['GET', 'POST']
      },
      pingTimeout: 60000,
      pingInterval: 25000
    });

    this.setupMiddleware();
    this.setupEventHandlers();

    logger.info('✅ Socket.IO initialized successfully');
    return this.io;
  }

  /**
   * Setup middleware cho authentication
   */
  setupMiddleware() {
    this.io.use((socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

        if (!token) {
          logger.warn(`Socket connection rejected: No token provided`);
          return next(new Error('Authentication required'));
        }

        const decoded = jwt.verify(token, config.JWT_SECRET);

        // Gắn thông tin user vào socket
        socket.userId = decoded.id || decoded.userId;
        socket.userEmail = decoded.email;
        socket.userRole = decoded.role;

        logger.info(`Socket authenticated: User ${socket.userId}`);
        next();
      } catch (error) {
        logger.error('Socket authentication error:', error.message);
        next(new Error('Invalid token'));
      }
    });
  }

  /**
   * Setup các event handlers chính
   */
  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      const userId = socket.userId;
      logger.info(`✅ User connected: ${userId} (Socket: ${socket.id})`);

      // Lưu mapping user-socket
      this.connectedUsers.set(userId, socket.id);
      this.userSockets.set(socket.id, userId);

      // Join user vào room riêng của họ
      socket.join(userId);

      // Thông báo user đã online
      this.broadcastUserStatus(userId, 'online');
      
      // Gửi danh sách online users cho tất cả clients
      this.io.emit('getOnlineUsers', this.getOnlineUsers());

      // Handle disconnect
      socket.on('disconnect', () => {
        logger.info(`❌ User disconnected: ${userId} (Socket: ${socket.id})`);
        this.connectedUsers.delete(userId);
        this.userSockets.delete(socket.id);
        this.broadcastUserStatus(userId, 'offline');
        
        // Cập nhật danh sách online users
        this.io.emit('getOnlineUsers', this.getOnlineUsers());
      });

      // Handle errors
      socket.on('error', (error) => {
        logger.error(`Socket error for user ${userId}:`, error);
      });

      // Custom events
      this.setupCustomEvents(socket);
    });
  }

  /**
   * Setup các custom events
   * Override method này để thêm custom events
   */
  setupCustomEvents(socket) {
    // Join room
    socket.on('join-room', (roomId) => {
      socket.join(roomId);
      logger.info(`User ${socket.userId} joined room: ${roomId}`);
      socket.emit('joined-room', { roomId });
    });

    // Leave room
    socket.on('leave-room', (roomId) => {
      socket.leave(roomId);
      logger.info(`User ${socket.userId} left room: ${roomId}`);
      socket.emit('left-room', { roomId });
    });

    // Typing indicator
    socket.on('typing', ({ roomId, isTyping }) => {
      socket.to(roomId).emit('user-typing', {
        userId: socket.userId,
        isTyping
      });
    });
  }

  /**
   * Broadcast user status (online/offline)
   */
  broadcastUserStatus(userId, status) {
    this.io.emit('user-status', {
      userId,
      status,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Gửi event đến một user cụ thể
   * @param {string} userId - User ID
   * @param {string} event - Event name
   * @param {*} data - Data to send
   */
  emitToUser(userId, event, data) {
    const socketId = this.connectedUsers.get(userId);
    if (socketId) {
      this.io.to(socketId).emit(event, data);
      logger.info(`Emitted '${event}' to user ${userId}`);
      return true;
    }
    logger.warn(`User ${userId} is not connected`);
    return false;
  }

  /**
   * Gửi event đến user room
   * @param {string} userId - User ID
   * @param {string} event - Event name
   * @param {*} data - Data to send
   */
  emitToUserRoom(userId, event, data) {
    this.io.to(`user:${userId}`).emit(event, data);
    logger.info(`Emitted '${event}' to user room: ${userId}`);
  }

  /**
   * Gửi event đến một room cụ thể
   * @param {string} roomId - Room ID
   * @param {string} event - Event name
   * @param {*} data - Data to send
   */
  emitToRoom(roomId, event, data) {
    this.io.to(roomId).emit(event, data);
    logger.info(`Emitted '${event}' to room: ${roomId}`);
  }

  /**
   * Broadcast event đến tất cả users
   * @param {string} event - Event name
   * @param {*} data - Data to send
   */
  broadcast(event, data) {
    this.io.emit(event, data);
    logger.info(`Broadcasted '${event}' to all users`);
  }

  /**
   * Broadcast event đến tất cả users trừ một user
   * @param {string} userId - User ID to exclude
   * @param {string} event - Event name
   * @param {*} data - Data to send
   */
  broadcastExcept(userId, event, data) {
    const socketId = this.connectedUsers.get(userId);
    if (socketId) {
      this.io.except(socketId).emit(event, data);
      logger.info(`Broadcasted '${event}' to all except user ${userId}`);
    }
  }

  /**
   * Kiểm tra user có đang online không
   * @param {string} userId - User ID
   * @returns {boolean}
   */
  isUserOnline(userId) {
    return this.connectedUsers.has(userId);
  }

  /**
   * Lấy danh sách users đang online
   * @returns {string[]} Array of user IDs
   */
  getOnlineUsers() {
    return Array.from(this.connectedUsers.keys());
  }

  /**
   * Lấy số lượng users đang online
   * @returns {number}
   */
  getOnlineCount() {
    return this.connectedUsers.size;
  }

  /**
   * Ngắt kết nối của một user
   * @param {string} userId - User ID
   */
  disconnectUser(userId) {
    const socketId = this.connectedUsers.get(userId);
    if (socketId) {
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket) {
        socket.disconnect(true);
        logger.info(`Forcefully disconnected user ${userId}`);
        return true;
      }
    }
    return false;
  }

  /**
   * Lấy Socket.IO instance
   * @returns {Server}
   */
  getIO() {
    if (!this.io) {
      throw new Error('Socket.IO not initialized. Call initialize() first.');
    }
    return this.io;
  }

  /**
   * Đóng socket server
   */
  close() {
    if (this.io) {
      this.io.close();
      this.connectedUsers.clear();
      this.userSockets.clear();
      logger.info('Socket.IO server closed');
    }
  }
}

// Export singleton instance
module.exports = new SocketManager();
