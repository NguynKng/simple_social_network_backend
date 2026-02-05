const dotenv = require('dotenv');
const App = require('./app');
const DatabaseConnection = require('./config/database');
const logger = require('./utils/logger');

// Load environment variables
dotenv.config();

class Server {
  constructor() {
    this.app = new App();
    this.port = parseInt(process.env.PORT || '5000', 10);
  }

  async start() {
    try {
      // Connect to database
      await DatabaseConnection.connect();
      logger.info('✅ Database connected successfully');

      // Start server
      const server = this.app.listen(this.port, () => {
        logger.info(`🚀 Server is running on port ${this.port}`);
        logger.info(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
        logger.info(`📡 API endpoint: http://localhost:${this.port}/api/${process.env.API_VERSION || 'v1'}`);
      });

      // Graceful shutdown
      this.setupGracefulShutdown(server);
    } catch (error) {
      logger.error('❌ Failed to start server:', error);
      process.exit(1);
    }
  }

  setupGracefulShutdown(server) {
    const shutdown = async (signal) => {
      logger.info(`\n${signal} received. Starting graceful shutdown...`);
      
      server.close(async () => {
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
