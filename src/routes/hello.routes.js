const express = require('express');
const HelloController = require('../controllers/HelloController');

class HelloRoutes {
  constructor() {
    this.router = express.Router();
    this.controller = new HelloController();
    this.initializeRoutes();
  }

  initializeRoutes() {
    /**
     * @route   GET /api/v1/hello
     * @desc    Simple hello world endpoint
     * @access  Public
     */
    this.router.get('/', this.controller.sayHello);

    /**
     * @route   GET /api/v1/hello/info
     * @desc    Get API information
     * @access  Public
     */
    this.router.get('/info', this.controller.getInfo);
  }

  getRouter() {
    return this.router;
  }
}

module.exports = HelloRoutes;
