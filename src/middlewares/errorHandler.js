const logger = require('../utils/logger');
const { AppError } = require('../utils/errors');

class ErrorHandler {
  constructor() {
    this.handle = this.handle.bind(this);
  }

  handle(error, req, res, _next) {
    let statusCode = 500;
    let message = 'Lỗi hệ thống';
    let errors = undefined;

    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      statusCode = 400;
      message = 'Dữ liệu không hợp lệ';
      errors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }));
    }
    // Handle Mongoose duplicate key error
    else if (error.name === 'MongoServerError' && error.code === 11000) {
      statusCode = 409;
      const field = Object.keys(error.keyPattern)[0];
      message = `${field} đã tồn tại`;
    }
    // Handle Mongoose CastError
    else if (error.name === 'CastError') {
      statusCode = 400;
      message = `Giá trị không hợp lệ cho trường ${error.path}`;
    }
    // Handle JWT errors
    else if (error.name === 'JsonWebTokenError') {
      statusCode = 401;
      message = 'Token không hợp lệ';
    }
    else if (error.name === 'TokenExpiredError') {
      statusCode = 401;
      message = 'Token đã hết hạn';
    }
    // Handle custom AppError và subclasses
    else if (error instanceof AppError || error.isOperational) {
      statusCode = error.statusCode || 500;
      message = error.message;
      errors = error.errors;
    }
    // Handle unexpected errors
    else {
      statusCode = 500;
      message = 'Lỗi hệ thống không mong đợi';
    }

    // Log error
    if (statusCode >= 500) {
      logger.error('Server Error:', {
        message: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method
      });
    } else {
      logger.warn('Client Error:', {
        message: error.message,
        statusCode,
        url: req.url,
        method: req.method
      });
    }

    // Send response với format nhất quán
    const response = {
      success: false,
      message,
      status: statusCode
    };

    // Thêm errors nếu có (validation errors)
    if (errors) {
      response.errors = errors;
    }

    res.status(statusCode).json(response);
  }
}

module.exports = ErrorHandler;
