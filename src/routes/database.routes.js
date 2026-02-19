/**
 * Database Test Routes
 * Routes để test kết nối và operations của MongoDB
 */

const express = require('express');
const router = express.Router();
const DatabaseConnection = require('../config/database');
const { User } = require('../models');
const authMiddleware = require('../middlewares/auth.middleware');

/**
 * GET /api/v1/db/health
 * Kiểm tra database health
 */
router.get('/health', async (req, res) => {
  try {
    const health = await DatabaseConnection.healthCheck();
    res.json({
      status: 'success',
      data: health
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

/**
 * GET /api/v1/db/stats
 * Lấy database statistics
 */
router.get('/stats', authMiddleware.authenticate, async (req, res) => {
  try {
    const stats = await DatabaseConnection.getStats();
    res.json({
      status: 'success',
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

/**
 * GET /api/v1/db/status
 * Lấy connection status
 */
router.get('/status', (req, res) => {
  const status = DatabaseConnection.getStatus();
  const isConnected = DatabaseConnection.isConnected();

  res.json({
    status: 'success',
    data: {
      connectionStatus: status,
      isConnected,
      timestamp: new Date().toISOString()
    }
  });
});

/**
 * GET /api/v1/db/collections
 * Lấy danh sách collections (admin only)
 */
router.get('/collections', 
  authMiddleware.authenticate,
  authMiddleware.authorizeRole('admin'),
  async (req, res) => {
    try {
      const mongoose = require('mongoose');
      const collections = await mongoose.connection.db.listCollections().toArray();
      
      res.json({
        status: 'success',
        data: {
          count: collections.length,
          collections: collections.map(c => ({
            name: c.name,
            type: c.type
          }))
        }
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  }
);

/**
 * POST /api/v1/db/test/user
 * Test tạo user
 */
router.post('/test/user', async (req, res) => {
  try {
    const { email, password, name, username } = req.body;

    // Validate
    if (!email || !password || !name || !username) {
      return res.status(400).json({
        status: 'error',
        message: 'Email, password, name, and username are required'
      });
    }

    // Check if email exists
    const emailExists = await User.emailExists(email);
    if (emailExists) {
      return res.status(400).json({
        status: 'error',
        message: 'Email already exists'
      });
    }

    // Check if username exists
    const usernameExists = await User.usernameExists(username);
    if (usernameExists) {
      return res.status(400).json({
        status: 'error',
        message: 'Username already exists'
      });
    }

    // Create user
    const user = await User.create({
      email,
      password,
      name,
      username
    });

    res.status(201).json({
      status: 'success',
      message: 'User created successfully',
      data: {
        id: user._id,
        email: user.email,
        name: user.name,
        username: user.username,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

/**
 * GET /api/v1/db/test/users
 * Test lấy danh sách users
 */
router.get('/test/users', async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;

    const result = await User.paginate({}, { page, limit });

    res.json({
      status: 'success',
      data: result.data,
      pagination: result.pagination
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

/**
 * GET /api/v1/db/test/user/:id
 * Test lấy user by ID
 */
router.get('/test/user/:id', async (req, res) => {
  try {
    const user = await User.findByIdOrFail(req.params.id);

    res.json({
      status: 'success',
      data: user
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      status: 'error',
      message: error.message
    });
  }
});

/**
 * DELETE /api/v1/db/test/user/:id
 * Test soft delete user
 */
router.delete('/test/user/:id', async (req, res) => {
  try {
    const user = await User.findByIdOrFail(req.params.id);
    await user.softDelete();

    res.json({
      status: 'success',
      message: 'User soft deleted successfully'
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      status: 'error',
      message: error.message
    });
  }
});

/**
 * POST /api/v1/db/test/user/:id/restore
 * Test restore user
 */
router.post('/test/user/:id/restore', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    await user.restore();

    res.json({
      status: 'success',
      message: 'User restored successfully'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

/**
 * POST /api/v1/db/seed
 * Seed test data (development only)
 */
router.post('/seed',
  async (req, res) => {
    try {
      if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({
          status: 'error',
          message: 'Seeding is not allowed in production'
        });
      }

      // Clear existing data
      await User.deleteMany({});

      // Create test users
      const users = await User.create([
        {
          email: 'admin@example.com',
          password: 'admin123',
          name: 'Admin User',
          username: 'admin',
          role: 'admin',
          isVerified: true
        },
        {
          email: 'user1@example.com',
          password: 'user123',
          name: 'John Doe',
          username: 'johndoe',
          isVerified: true
        },
        {
          email: 'user2@example.com',
          password: 'user123',
          name: 'Jane Smith',
          username: 'janesmith',
          isVerified: true
        }
      ]);

      res.json({
        status: 'success',
        message: 'Database seeded successfully',
        data: {
          usersCreated: users.length,
          users: users.map(u => ({
            id: u._id,
            email: u.email,
            username: u.username,
            role: u.role
          }))
        }
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  }
);

module.exports = router;
