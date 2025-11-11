// ===================================
// GLOBAL ERROR HANDLING MIDDLEWARE
// ===================================

const { AppError, parseMySQLError } = require('../utils/errors');

/**
 * Log Error Details
 * Logs error information for debugging and monitoring
 */
const logError = (error, req) => {
  const errorLog = {
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    ip: req.ip,
    userId: req.user?.user_id || 'anonymous',
    error: {
      name: error.name,
      message: error.message,
      statusCode: error.statusCode,
      stack: error.stack
    }
  };

  // Log to console (in production, use proper logging service)
  if (process.env.NODE_ENV === 'development') {
    console.error('❌ ERROR:', JSON.stringify(errorLog, null, 2));
  } else {
    // In production, only log error message without full stack
    console.error(`❌ ERROR: ${error.message} | Path: ${req.path} | User: ${errorLog.userId}`);
  }

  // TODO: Send to logging service (e.g., Winston, Sentry, CloudWatch)
  // logToService(errorLog);
};

/**
 * Send Error Response
 * Formats and sends error response to client
 */
const sendErrorResponse = (error, req, res) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const statusCode = error.statusCode || 500;

  // Base error response
  const errorResponse = {
    success: false,
    status: error.status || 'error',
    message: error.message || 'Something went wrong'
  };

  // Add additional details in development mode
  if (!isProduction) {
    errorResponse.error = {
      name: error.name,
      statusCode: error.statusCode,
      isOperational: error.isOperational
    };

    // Include stack trace in development
    if (error.stack) {
      errorResponse.stack = error.stack.split('\n').map(line => line.trim());
    }

    // Include original error for database errors
    if (error.originalError) {
      errorResponse.originalError = {
        code: error.originalError.code,
        message: error.originalError.message,
        sqlMessage: error.originalError.sqlMessage
      };
    }
  } else {
    // In production, generic message for programming/unknown errors
    if (!error.isOperational) {
      errorResponse.message = 'An unexpected error occurred. Please try again later.';
    }
  }

  // Add validation errors array if present
  if (error.errors && Array.isArray(error.errors)) {
    errorResponse.errors = error.errors;
  }

  res.status(statusCode).json(errorResponse);
};

/**
 * Handle MySQL Errors
 * Converts MySQL errors to AppError instances
 */
const handleMySQLError = (error) => {
  if (error.code && error.code.startsWith('ER_')) {
    return parseMySQLError(error);
  }
  return error;
};

/**
 * Handle JWT Errors
 * Converts JWT errors to AppError instances
 */
const handleJWTError = (error) => {
  if (error.name === 'JsonWebTokenError') {
    const { AuthenticationError } = require('../utils/errors');
    return new AuthenticationError('Invalid token. Please log in again.');
  }
  if (error.name === 'TokenExpiredError') {
    const { AuthenticationError } = require('../utils/errors');
    return new AuthenticationError('Your session has expired. Please log in again.');
  }
  return error;
};

/**
 * Handle Multer (File Upload) Errors
 */
const handleMulterError = (error) => {
  if (error.name === 'MulterError') {
    const { ValidationError } = require('../utils/errors');

    if (error.code === 'LIMIT_FILE_SIZE') {
      return new ValidationError('File size exceeds maximum allowed limit');
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return new ValidationError('Too many files uploaded');
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return new ValidationError('Unexpected file field');
    }

    return new ValidationError(`File upload error: ${error.message}`);
  }
  return error;
};

/**
 * Global Error Handler Middleware
 * This should be the last middleware in the app
 */
const errorHandler = (error, req, res, next) => {
  // Convert known errors to AppError instances
  let err = error;

  // Handle MySQL errors
  err = handleMySQLError(err);

  // Handle JWT errors
  err = handleJWTError(err);

  // Handle Multer errors
  err = handleMulterError(err);

  // If not an AppError, convert to InternalServerError
  if (!(err instanceof AppError)) {
    const { InternalServerError } = require('../utils/errors');
    err = new InternalServerError(err.message || 'Something went wrong', false);
  }

  // Log error details
  logError(err, req);

  // Send error response to client
  sendErrorResponse(err, req, res);
};

/**
 * 404 Not Found Handler
 * Catches all unmatched routes
 */
const notFoundHandler = (req, res, next) => {
  const { NotFoundError } = require('../utils/errors');
  const error = new NotFoundError(`Route ${req.originalUrl} not found`);
  next(error);
};

/**
 * Unhandled Rejection Handler
 * Catches unhandled promise rejections
 */
const unhandledRejectionHandler = () => {
  process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ UNHANDLED REJECTION:', reason);
    console.error('Promise:', promise);

    // In production, might want to gracefully shutdown
    if (process.env.NODE_ENV === 'production') {
      // Log to monitoring service
      console.error('Shutting down due to unhandled rejection...');
      process.exit(1);
    }
  });
};

/**
 * Uncaught Exception Handler
 * Catches uncaught exceptions
 */
const uncaughtExceptionHandler = () => {
  process.on('uncaughtException', (error) => {
    console.error('❌ UNCAUGHT EXCEPTION:', error);
    console.error('Shutting down...');
    process.exit(1);
  });
};

// ===================================
// EXPORTS
// ===================================

module.exports = {
  errorHandler,
  notFoundHandler,
  unhandledRejectionHandler,
  uncaughtExceptionHandler
};
