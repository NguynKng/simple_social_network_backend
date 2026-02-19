const mongoose = require('mongoose');
const logger = require('../utils/logger');

class DatabaseConnection {
  constructor() {
    this.instance = null;
    this.isConnecting = false;
    this.retryCount = 0;
    this.maxRetries = parseInt(process.env.DB_MAX_RETRIES || '5', 10);
    this.retryDelay = parseInt(process.env.DB_RETRY_DELAY || '5000', 10);
  }

  async connect() {
    if (this.instance) {
      return this.instance;
    }

    if (this.isConnecting) {
      logger.info('Connection attempt already in progress...');
      return this.waitForConnection();
    }

    this.isConnecting = true;

    try {
      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/social_network';
      const dbName = process.env.DB_NAME || 'social_network';
      
      logger.info(`Connecting to MongoDB: ${dbName}...`);
      
      mongoose.set('strictQuery', false);
      
      // Connection options
      const options = {
        dbName,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        family: 4, // Use IPv4
      };
      
      this.instance = await mongoose.connect(mongoUri, options);
      
      this.setupConnectionEvents();
      
      this.retryCount = 0;
      this.isConnecting = false;
      
      logger.info('✅ MongoDB connection established');
      return this.instance;
    } catch (error) {
      this.isConnecting = false;
      logger.error(`Failed to connect to MongoDB (attempt ${this.retryCount + 1}/${this.maxRetries}):`, error.message);
      
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        logger.info(`Retrying in ${this.retryDelay / 1000} seconds...`);
        await this.sleep(this.retryDelay);
        return this.connect();
      }
      
      throw new Error(`Failed to connect to MongoDB after ${this.maxRetries} attempts`);
    }
  }

  setupConnectionEvents() {
    // Connection events
    mongoose.connection.on('connected', () => {
      logger.info('✅ MongoDB connected');
    });

    mongoose.connection.on('error', (error) => {
      logger.error('❌ MongoDB connection error:', error);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('⚠️ MongoDB disconnected');
      if (this.instance) {
        logger.info('Attempting to reconnect...');
      }
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('✅ MongoDB reconnected');
    });
  }

  async waitForConnection() {
    let attempts = 0;
    const maxAttempts = 30;
    
    while (this.isConnecting && attempts < maxAttempts) {
      await this.sleep(1000);
      attempts++;
    }
    
    if (this.instance) {
      return this.instance;
    }
    
    throw new Error('Connection timeout');
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async disconnect() {
    if (this.instance) {
      await mongoose.disconnect();
      this.instance = null;
      this.retryCount = 0;
      logger.info('✅ MongoDB disconnected');
    }
  }

  getConnection() {
    return this.instance;
  }

  /**
   * Check if database is connected
   */
  isConnected() {
    return mongoose.connection.readyState === 1;
  }

  /**
   * Get connection status
   */
  getStatus() {
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };
    return states[mongoose.connection.readyState] || 'unknown';
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      if (!this.isConnected()) {
        return {
          status: 'unhealthy',
          message: 'Database not connected'
        };
      }

      // Ping database
      await mongoose.connection.db.admin().ping();

      return {
        status: 'healthy',
        database: mongoose.connection.name,
        host: mongoose.connection.host,
        port: mongoose.connection.port,
        state: this.getStatus()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }

  /**
   * Get database statistics
   */
  async getStats() {
    try {
      if (!this.isConnected()) {
        throw new Error('Database not connected');
      }

      const stats = await mongoose.connection.db.stats();
      return {
        database: stats.db,
        collections: stats.collections,
        objects: stats.objects,
        dataSize: this.formatBytes(stats.dataSize),
        storageSize: this.formatBytes(stats.storageSize),
        indexes: stats.indexes,
        indexSize: this.formatBytes(stats.indexSize)
      };
    } catch (error) {
      logger.error('Failed to get database stats:', error);
      throw error;
    }
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }
}

// Export singleton instance
module.exports = new DatabaseConnection();
