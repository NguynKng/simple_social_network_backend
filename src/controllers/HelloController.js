class HelloController {
  constructor() {
    // Bind methods to maintain 'this' context
    this.sayHello = this.sayHello.bind(this);
    this.getInfo = this.getInfo.bind(this);
  }

  /**
   * @route   GET /api/v1/hello
   * @desc    Simple hello world endpoint
   * @access  Public
   */
  sayHello(req, res) {
    try {
      res.status(200).json({
        status: 'success',
        message: 'Hello from Express.js Backend! 🚀',
        data: {
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          environment: process.env.NODE_ENV || 'development'
        }
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * @route   GET /api/v1/hello/info
   * @desc    Get API information
   * @access  Public
   */
  getInfo(req, res) {
    try {
      res.status(200).json({
        status: 'success',
        message: 'API Information',
        data: {
          name: 'Social Network API',
          version: '1.0.0',
          description: 'Backend API cho mạng xã hội đơn giản',
          technology: {
            language: 'JavaScript',
            framework: 'Express.js',
            database: 'MongoDB',
            architecture: 'OOP (Object-Oriented Programming)'
          },
          endpoints: {
            health: '/health',
            hello: '/api/v1/hello',
            info: '/api/v1/hello/info'
          }
        }
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: 'Internal server error',
        error: error.message
      });
    }
  }
}

module.exports = HelloController;
