const dotenv = require('dotenv');
const http = require('http');
const App = require('./app');
const DatabaseConnection = require('./config/database');
const socketManager = require('./config/socket');
const logger = require('./utils/logger');

dotenv.config();

class Server {
  constructor() {
    this.app = new App();
    this.port = parseInt(process.env.PORT || '5000', 10);
    this.httpServer = null;
  }

  async start() {
    try {
      // Connect to database
      await DatabaseConnection.connect();
      logger.info('✅ Database connected successfully');

      // Create HTTP server
      this.httpServer = http.createServer(this.app.getApp());

      // Initialize Socket.IO
      socketManager.initialize(this.httpServer);
      logger.info('✅ Socket.IO initialized');

      // Start server
      this.httpServer.listen(this.port, () => {
        logger.info(`🚀 Server is running on port ${this.port}`);
        logger.info(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
        logger.info(`📡 API endpoint: http://localhost:${this.port}/api/${process.env.API_VERSION || 'v1'}`);
        logger.info(`🔌 WebSocket endpoint: ws://localhost:${this.port}`);
      });

      // Graceful shutdown
      this.setupGracefulShutdown();
    } catch (error) {
      logger.error('❌ Failed to start server:', error);
      process.exit(1);
    }
  }

  setupGracefulShutdown() {
    const shutdown = async (signal) => {
      logger.info(`\n${signal} received. Starting graceful shutdown...`);
      
      // Close Socket.IO
      socketManager.close();
      logger.info('✅ Socket.IO closed');
      
      this.httpServer.close(async () => {
        logger.info('✅ HTTP server closed');
        
        try {
          await DatabaseConnection.disconnect();
          logger.info('✅ Database connection closed');
          process.exit(0);
        } catch (error) {
          logger.error('❌ Error during shutdown:', error);
          process.exit(1);
        }
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('⚠️ Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  }
}

// Start the server
const server = new Server();
server.start();
