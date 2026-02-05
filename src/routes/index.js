const express = require('express');
const HelloRoutes = require('./hello.routes');

class RouteManager {
  constructor() {
    this.router = express.Router();
    this.helloRoutes = new HelloRoutes();
    this.initializeRoutes();
  }

  initializeRoutes() {
    // Hello routes (for testing)
    this.router.use('/hello', this.helloRoutes.getRouter());

    // Add more route modules here as you develop
    // this.router.use('/auth', authRoutes);
    // this.router.use('/posts', postRoutes);
    // this.router.use('/users', userRoutes);
  }

  getRouter() {
    return this.router;
  }
}

module.exports = RouteManager;
