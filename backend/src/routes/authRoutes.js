const express = require('express');
const router = express.Router();
const { login, register, getMe, logout, changePassword } = require('../controllers/authController');
const { authenticate, authorize } = require('../middleware/auth');
const { loginLimiter, passwordResetLimiter } = require('../middleware/rateLimiter');

// Public routes with rate limiting
router.post('/login', loginLimiter, login);

// Account creation is SUPER_ADMIN-only. Previously this was public and trusted a
// `role` from the body, letting anyone self-register as SUPER_ADMIN.
router.post('/register', authenticate, authorize('SUPER_ADMIN'), register);

// Protected routes
router.get('/me', authenticate, getMe);
router.post('/logout', authenticate, logout);
router.post('/change-password', authenticate, changePassword);

module.exports = router;
