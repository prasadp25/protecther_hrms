// ===================================
// CUSTOM ERROR CLASSES
// ===================================

/**
 * Base Application Error
 * All custom errors extend this class
 */
class AppError extends Error {
  constructor(message, statusCode, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational; // Indicates if error is expected/handled
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 400 - Bad Request
 * Used for validation errors and malformed requests
 */
class ValidationError extends AppError {
  constructor(message = 'Validation failed') {
    super(message, 400);
    this.name = 'ValidationError';
  }
}

/**
 * 401 - Unauthorized
 * Used for authentication failures
 */
class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401);
    this.name = 'AuthenticationError';
  }
}

/**
 * 403 - Forbidden
 * Used for authorization failures
 */
class AuthorizationError extends AppError {
  constructor(message = 'Access forbidden') {
    super(message, 403);
    this.name = 'AuthorizationError';
  }
}

/**
 * 404 - Not Found
 * Used when a resource is not found
 */
class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404);
    this.name = 'NotFoundError';
  }
}

/**
 * 409 - Conflict
 * Used for duplicate entries or conflicts
 */
class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, 409);
    this.name = 'ConflictError';
  }
}

/**
 * 429 - Too Many Requests
 * Used for rate limiting
 */
class RateLimitError extends AppError {
  constructor(message = 'Too many requests, please try again later') {
    super(message, 429);
    this.name = 'RateLimitError';
  }
}

/**
 * 500 - Internal Server Error
 * Used for unexpected errors
 */
class InternalServerError extends AppError {
  constructor(message = 'Internal server error', isOperational = false) {
    super(message, 500, isOperational);
    this.name = 'InternalServerError';
  }
}

/**
 * Database Error Handler
 * Converts database errors to appropriate AppErrors
 */
class DatabaseError extends AppError {
  constructor(message = 'Database operation failed', originalError = null) {
    super(message, 500, false);
    this.name = 'DatabaseError';
    this.originalError = originalError;
  }
}

// ===================================
// ERROR UTILITIES
// ===================================

/**
 * Async Handler Wrapper
 * Wraps async route handlers to catch errors automatically
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Parse MySQL Error
 * Converts MySQL errors to user-friendly messages
 */
const parseMySQLError = (error) => {
  // Duplicate entry error
  if (error.code === 'ER_DUP_ENTRY') {
    const match = error.sqlMessage?.match(/Duplicate entry '(.*)' for key '(.*)'/);
    const value = match?.[1] || 'value';
    const key = match?.[2] || 'field';
    return new ConflictError(`A record with ${key} '${value}' already exists`);
  }

  // Foreign key constraint error
  if (error.code === 'ER_NO_REFERENCED_ROW_2' || error.code === 'ER_ROW_IS_REFERENCED_2') {
    return new ValidationError('Cannot complete operation due to related records');
  }

  // Data too long
  if (error.code === 'ER_DATA_TOO_LONG') {
    return new ValidationError('One or more fields exceed maximum length');
  }

  // Invalid data type
  if (error.code === 'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD') {
    return new ValidationError('Invalid data type for one or more fields');
  }

  // Table doesn't exist
  if (error.code === 'ER_NO_SUCH_TABLE') {
    return new InternalServerError('Database table not found. Please contact support.');
  }

  // Connection error
  if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
    return new InternalServerError('Database connection failed. Please try again later.');
  }

  // Generic database error
  return new DatabaseError('Database operation failed', error);
};

/**
 * Validation Error Builder
 * Builds structured validation error from multiple field errors
 */
const buildValidationError = (errors) => {
  const messages = Array.isArray(errors) ? errors.join('; ') : errors;
  const error = new ValidationError(messages);
  error.errors = errors;
  return error;
};

// ===================================
// EXPORTS
// ===================================

module.exports = {
  // Error Classes
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  InternalServerError,
  DatabaseError,

  // Utilities
  asyncHandler,
  parseMySQLError,
  buildValidationError
};
