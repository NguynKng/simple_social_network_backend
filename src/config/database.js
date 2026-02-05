const mongoose = require('mongoose');
const logger = require('../utils/logger');

class DatabaseConnection {
  constructor() {
    this.instance = null;
  }

  async connect() {
    if (this.instance) {
      return this.instance;
    }

    try {
      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/social_network';
      
      mongoose.set('strictQuery', false);
      
      this.instance = await mongoose.connect(mongoUri, {
        dbName: process.env.DB_NAME || 'social_network',
      });

      // Connection events
      mongoose.connection.on('connected', () => {
        logger.info('MongoDB connected successfully');
      });

      mongoose.connection.on('error', (error) => {
        logger.error('MongoDB connection error:', error);
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected');
      });

      return this.instance;
    } catch (error) {
      logger.error('Failed to connect to MongoDB:', error);
      throw error;
    }
  }

  async disconnect() {
    if (this.instance) {
      await mongoose.disconnect();
      this.instance = null;
    }
  }

  getConnection() {
    return this.instance;
  }
}

// Export singleton instance
module.exports = new DatabaseConnection();
