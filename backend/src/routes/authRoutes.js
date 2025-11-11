const express = require('express');
const router = express.Router();
const { login, register, getMe, logout, changePassword } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { loginLimiter, passwordResetLimiter } = require('../middleware/rateLimiter');

// Public routes with rate limiting (temporarily disabled for development)
router.post('/login', login);  // loginLimiter temporarily removed
router.post('/register', loginLimiter, register);

// Protected routes
router.get('/me', authenticate, getMe);
router.post('/logout', authenticate, logout);
router.post('/change-password', authenticate, changePassword);

module.exports = router;
