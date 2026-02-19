/**
 * Custom Error Classes
 * Các lớp error tùy chỉnh với status code để service có thể throw
 */

/**
 * Base Application Error
 */
class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true; // Để phân biệt với programming errors
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Bad Request Error (400)
 * Dùng cho validation errors, missing fields, invalid input
 */
class BadRequestError extends AppError {
  constructor(message) {
    super(message, 400);
  }
}

/**
 * Unauthorized Error (401)
 * Dùng cho authentication failures
 */
class UnauthorizedError extends AppError {
  constructor(message = 'Không có quyền truy cập') {
    super(message, 401);
  }
}

/**
 * Forbidden Error (403)
 * Dùng cho authorization failures
 */
class ForbiddenError extends AppError {
  constructor(message = 'Không được phép thực hiện hành động này') {
    super(message, 403);
  }
}

/**
 * Not Found Error (404)
 * Dùng khi resource không tồn tại
 */
class NotFoundError extends AppError {
  constructor(message = 'Không tìm thấy') {
    super(message, 404);
  }
}

/**
 * Conflict Error (409)
 * Dùng cho duplicate data, conflicts
 */
class ConflictError extends AppError {
  constructor(message = 'Dữ liệu đã tồn tại') {
    super(message, 409);
  }
}

/**
 * Validation Error (422)
 * Dùng cho business logic validation failures
 */
class ValidationError extends AppError {
  constructor(message, errors = []) {
    super(message, 422);
    this.errors = errors;
  }
}

/**
 * Internal Server Error (500)
 * Dùng cho các lỗi không mong đợi
 */
class InternalError extends AppError {
  constructor(message = 'Lỗi hệ thống') {
    super(message, 500);
  }
}

module.exports = {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
  InternalError
};
