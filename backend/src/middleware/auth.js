const jwt = require('jsonwebtoken');
const { executeQuery } = require('../config/database');

// ==============================================
// VERIFY JWT TOKEN
// ==============================================
const authenticate = async (req, res, next) => {
  try {
    // Debug logging
    console.log('🔐 Auth middleware - Request:', req.method, req.path);
    console.log('🍪 Cookies received:', req.cookies);
    console.log('📋 Headers:', req.headers);

    // Get token from httpOnly cookie (primary) or Authorization header (fallback)
    let token = req.cookies?.auth_token;

    // Fallback to Authorization header for backward compatibility
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      }
    }

    console.log('🎫 Token found:', token ? 'YES' : 'NO');

    if (!token) {
      console.log('❌ No token provided');
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if user still exists and is active
    const users = await executeQuery(
      'SELECT user_id, username, email, role, employee_id FROM users WHERE user_id = ? AND status = ?',
      [decoded.user_id, 'ACTIVE']
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'User no longer exists or is inactive'
      });
    }

    // Attach user to request object
    req.user = users[0];
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Authentication failed',
      error: error.message
    });
  }
};

// ==============================================
// AUTHORIZE ROLES
// ==============================================
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.'
      });
    }

    next();
  };
};

// ==============================================
// OPTIONAL AUTHENTICATION
// ==============================================
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const users = await executeQuery(
        'SELECT user_id, username, email, role, employee_id FROM users WHERE user_id = ? AND status = ?',
        [decoded.user_id, 'ACTIVE']
      );

      if (users.length > 0) {
        req.user = users[0];
      }
    }

    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

module.exports = {
  authenticate,
  authorize,
  optionalAuth
};
