const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { executeQuery } = require('../config/database');
const { validatePassword } = require('../utils/passwordValidator');
const { logCustomEvent } = require('../middleware/auditLogger');
const {
  asyncHandler,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError
} = require('../utils/errors');

// ==============================================
// LOGIN
// ==============================================
const login = asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  // Validation
  if (!username || !password) {
    throw new ValidationError('Username and password are required');
  }

  // Find user with company info
  const query = `
    SELECT u.*, c.company_code, c.company_name
    FROM users u
    LEFT JOIN companies c ON u.company_id = c.company_id
    WHERE u.username = ?
  `;
  const users = await executeQuery(query, [username]);

  if (users.length === 0) {
    throw new AuthenticationError('Invalid credentials');
  }

  const user = users[0];

  // Check if user is active
  if (user.status !== 'ACTIVE') {
    throw new AuthorizationError('Account is not active. Please contact administrator.');
  }

  // Check if account is locked
  if (user.account_locked_until) {
    const lockTime = new Date(user.account_locked_until);
    const now = new Date();

    if (lockTime > now) {
      const minutesRemaining = Math.ceil((lockTime - now) / (1000 * 60));
      const error = new AuthorizationError(
        `Account is locked due to too many failed login attempts. Try again in ${minutesRemaining} minutes.`
      );
      error.lockedUntil = lockTime.toISOString();
      throw error;
    } else {
      // Lock has expired, reset failed attempts
      await executeQuery(
        'UPDATE users SET failed_login_attempts = 0, account_locked_until = NULL WHERE user_id = ?',
        [user.user_id]
      );
    }
  }

  // Compare password
  const isPasswordValid = await bcrypt.compare(password, user.password_hash);

  if (!isPasswordValid) {
    // Increment failed attempts
    const maxAttempts = parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5;
    const lockoutDuration = parseInt(process.env.ACCOUNT_LOCKOUT_DURATION_MINUTES) || 30;
    const attempts = (user.failed_login_attempts || 0) + 1;

    if (attempts >= maxAttempts) {
      // Lock the account
      const lockUntil = new Date(Date.now() + lockoutDuration * 60 * 1000);
      await executeQuery(
        `UPDATE users
         SET failed_login_attempts = ?,
             account_locked_until = ?,
             last_failed_login = NOW()
         WHERE user_id = ?`,
        [attempts, lockUntil, user.user_id]
      );

      const error = new AuthorizationError(
        `Account locked due to ${maxAttempts} failed login attempts. Try again in ${lockoutDuration} minutes.`
      );
      error.lockedUntil = lockUntil.toISOString();
      throw error;
    } else {
      // Update failed attempts
      await executeQuery(
        `UPDATE users
         SET failed_login_attempts = ?,
             last_failed_login = NOW()
         WHERE user_id = ?`,
        [attempts, user.user_id]
      );

      const attemptsRemaining = maxAttempts - attempts;
      const error = new AuthenticationError(
        `Invalid credentials. ${attemptsRemaining} attempt(s) remaining before account lockout.`
      );
      error.attemptsRemaining = attemptsRemaining;
      throw error;
    }
  }

  // Successful login - reset failed attempts
  await executeQuery(
    `UPDATE users
     SET failed_login_attempts = 0,
         account_locked_until = NULL,
         last_failed_login = NULL,
         last_login = NOW()
     WHERE user_id = ?`,
    [user.user_id]
  );

  // Generate JWT token (include company_id for filtering)
  const token = jwt.sign(
    {
      user_id: user.user_id,
      username: user.username,
      role: user.role,
      company_id: user.company_id
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );

  // Log successful login
  await logCustomEvent(user.user_id, 'LOGIN_SUCCESS', 'users', {
    username: user.username,
    role: user.role,
    ip: req.ip || req.connection.remoteAddress
  });

  // Set JWT in httpOnly cookie (secure against XSS)
  const isProduction = process.env.NODE_ENV === 'production';

  // Cookie options differ by environment
  const cookieOptions = {
    httpOnly: true, // Cannot be accessed by JavaScript
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    path: '/'
  };

  if (isProduction) {
    cookieOptions.secure = true; // Only HTTPS in production
    cookieOptions.sameSite = 'strict'; // Strict CSRF protection
  }
  // In development, don't set sameSite - allows cookies to work across localhost ports

  res.cookie('auth_token', token, cookieOptions);

  console.log('✅ Login successful for user:', user.username);
  console.log('🍪 Cookie options:', cookieOptions);
  console.log('🎫 Token set in cookie');

  // Return success response with token in body for localStorage
  res.status(200).json({
    success: true,
    message: 'Login successful',
    data: {
      token: token, // Include token for localStorage-based auth
      user: {
        user_id: user.user_id,
        username: user.username,
        email: user.email,
        role: user.role,
        employee_id: user.employee_id,
        company_id: user.company_id,
        company_code: user.company_code,
        company_name: user.company_name
      }
    }
  });
});

// ==============================================
// REGISTER
// ==============================================
const register = asyncHandler(async (req, res) => {
  const { username, email, password, role, employee_id, company_id } = req.body;

  // Validation
  if (!username || !email || !password) {
    throw new ValidationError('Username, email, and password are required');
  }

  // For non-SUPER_ADMIN roles, company_id is required
  const targetRole = role || 'EMPLOYEE';
  if (targetRole !== 'SUPER_ADMIN' && !company_id) {
    throw new ValidationError('Company ID is required for non-SUPER_ADMIN users');
  }

  // Validate password strength
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    const error = new ValidationError('Password does not meet security requirements');
    error.errors = passwordValidation.errors;
    throw error;
  }

  // Check if username exists
  const existingUsers = await executeQuery(
    'SELECT user_id FROM users WHERE username = ? OR email = ?',
    [username, email]
  );

  if (existingUsers.length > 0) {
    throw new ConflictError('Username or email already exists');
  }

  // Hash password
  const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS) || 10);
  const passwordHash = await bcrypt.hash(password, salt);

  // Insert user
  const query = `
    INSERT INTO users (username, email, password_hash, role, employee_id, company_id, status)
    VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE')
  `;

  const result = await executeQuery(query, [
    username,
    email,
    passwordHash,
    targetRole,
    employee_id || null,
    targetRole === 'SUPER_ADMIN' ? null : company_id
  ]);

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: {
      user_id: result.insertId,
      username,
      email,
      role: targetRole,
      company_id: targetRole === 'SUPER_ADMIN' ? null : company_id
    }
  });
});

// ==============================================
// GET CURRENT USER
// ==============================================
const getMe = asyncHandler(async (req, res) => {
  const userId = req.user.user_id;

  const query = `
    SELECT u.user_id, u.username, u.email, u.role, u.employee_id, u.last_login,
           u.company_id, c.company_code, c.company_name,
           e.first_name, e.last_name, e.mobile, e.designation
    FROM users u
    LEFT JOIN employees e ON u.employee_id = e.employee_id
    LEFT JOIN companies c ON u.company_id = c.company_id
    WHERE u.user_id = ?
  `;

  const users = await executeQuery(query, [userId]);

  if (users.length === 0) {
    throw new NotFoundError('User');
  }

  res.status(200).json({
    success: true,
    data: users[0]
  });
});

// ==============================================
// LOGOUT
// ==============================================
const logout = asyncHandler(async (req, res) => {
  // Clear the httpOnly cookie
  res.clearCookie('auth_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/'
  });

  // Log logout event
  if (req.user) {
    await logCustomEvent(req.user.user_id, 'LOGOUT', 'users', {
      username: req.user.username,
      ip: req.ip || req.connection.remoteAddress
    });
  }

  res.status(200).json({
    success: true,
    message: 'Logout successful'
  });
});

// ==============================================
// CHANGE PASSWORD
// ==============================================
const changePassword = asyncHandler(async (req, res) => {
  const userId = req.user.user_id;
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw new ValidationError('Current password and new password are required');
  }

  // Get current user
  const users = await executeQuery(
    'SELECT password_hash FROM users WHERE user_id = ?',
    [userId]
  );

  if (users.length === 0) {
    throw new NotFoundError('User');
  }

  // Verify current password
  const isValid = await bcrypt.compare(currentPassword, users[0].password_hash);

  if (!isValid) {
    throw new AuthenticationError('Current password is incorrect');
  }

  // Validate new password strength
  const passwordValidation = validatePassword(newPassword);
  if (!passwordValidation.valid) {
    const error = new ValidationError('New password does not meet security requirements');
    error.errors = passwordValidation.errors;
    throw error;
  }

  // Prevent reusing the same password
  const isSamePassword = await bcrypt.compare(newPassword, users[0].password_hash);
  if (isSamePassword) {
    throw new ValidationError('New password must be different from current password');
  }

  // Hash new password
  const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS) || 10);
  const newPasswordHash = await bcrypt.hash(newPassword, salt);

  // Update password
  await executeQuery(
    'UPDATE users SET password_hash = ? WHERE user_id = ?',
    [newPasswordHash, userId]
  );

  res.status(200).json({
    success: true,
    message: 'Password changed successfully'
  });
});

module.exports = {
  login,
  register,
  getMe,
  logout,
  changePassword
};
