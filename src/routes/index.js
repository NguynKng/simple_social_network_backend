const express = require('express');
const socketRoutes = require('./socket.routes');
const databaseRoutes = require('./database.routes');
const authRoutes = require('./auth.routes');
const newsRoutes = require("./news.routes")
const postRoutes = require('./post.routes');

class RouteManager {
  constructor() {
    this.router = express.Router();
    this.initializeRoutes();
  }

  initializeRoutes() {

    // Socket test routes
    this.router.use('/socket', socketRoutes);

    // Database test routes
    this.router.use('/db', databaseRoutes);

    // Authentication routes
    this.router.use('/auth', authRoutes);
    // News routes
    this.router.use('/news', newsRoutes);
    // Post routes
    this.router.use('/posts', postRoutes);
    // Add more route modules here as you develop
    // this.router.use('/users', userRoutes);
  }

  getRouter() {
    return this.router;
  }
}

module.exports = RouteManager;
