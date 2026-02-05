const logger = require('../utils/logger');

class ErrorHandler {
  constructor() {
    this.handle = this.handle.bind(this);
  }

  handle(error, req, res, _next) {
    let statusCode = 500;
    let message = 'Internal server error';

    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      statusCode = 400;
      message = 'Validation error';
    }

    // Handle Mongoose duplicate key error
    if (error.name === 'MongoServerError' && error.code === 11000) {
      statusCode = 400;
      message = 'Duplicate field value';
    }

    // Handle custom errors with statusCode
    if (error.statusCode) {
      statusCode = error.statusCode;
      message = error.message;
    }

    // Log error
    if (statusCode >= 500) {
      logger.error('Error:', {
        message: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method
      });
    }

    // Send response
    res.status(statusCode).json({
      status: 'error',
      message,
      ...(process.env.NODE_ENV === 'development' && {
        error: error.message,
        stack: error.stack
      })
    });
  }
}

module.exports = ErrorHandler;
