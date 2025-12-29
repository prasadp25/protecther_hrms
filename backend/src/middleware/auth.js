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

    // Check if user still exists and is active (include company info)
    const users = await executeQuery(
      `SELECT u.user_id, u.username, u.email, u.role, u.employee_id, u.company_id,
              c.company_code, c.company_name
       FROM users u
       LEFT JOIN companies c ON u.company_id = c.company_id
       WHERE u.user_id = ? AND u.status = ?`,
      [decoded.user_id, 'ACTIVE']
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'User no longer exists or is inactive'
      });
    }

    // Attach user to request object with company context
    req.user = users[0];

    // For non-SUPER_ADMIN users, company_id is required
    if (req.user.role !== 'SUPER_ADMIN' && !req.user.company_id) {
      return res.status(403).json({
        success: false,
        message: 'User is not assigned to any company'
      });
    }

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

    // SUPER_ADMIN has access to everything
    if (req.user.role === 'SUPER_ADMIN') {
      return next();
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
// COMPANY CONTEXT HELPERS
// ==============================================
/**
 * Get company filter for queries
 * Returns company_id for regular users, null for SUPER_ADMIN (no filter)
 */
const getCompanyFilter = (req) => {
  if (req.user.role === 'SUPER_ADMIN') {
    // SUPER_ADMIN can optionally filter by company using query param
    return req.query.company_id ? parseInt(req.query.company_id) : null;
  }
  return req.user.company_id;
};

/**
 * Build WHERE clause for company filtering
 * @param {string} tableAlias - Optional table alias (e.g., 'e' for employees)
 * @param {object} req - Express request object
 * @returns {object} { clause: string, params: array }
 */
const buildCompanyFilter = (tableAlias, req) => {
  const companyId = getCompanyFilter(req);
  if (companyId === null) {
    return { clause: '', params: [] };
  }
  const column = tableAlias ? `${tableAlias}.company_id` : 'company_id';
  return { clause: ` AND ${column} = ?`, params: [companyId] };
};

/**
 * Middleware to require company context
 * Use this for routes that must have a company selected
 */
const requireCompany = (req, res, next) => {
  if (req.user.role === 'SUPER_ADMIN' && !req.query.company_id && !req.body.company_id) {
    return res.status(400).json({
      success: false,
      message: 'Company selection required for this operation'
    });
  }
  next();
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
  optionalAuth,
  getCompanyFilter,
  buildCompanyFilter,
  requireCompany
};
