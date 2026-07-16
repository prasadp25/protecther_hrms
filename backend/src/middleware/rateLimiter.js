const rateLimit = require('express-rate-limit');

// General API rate limiter (mounted globally in app.js)
// Generous ceiling — normal dashboard usage stays far below it; it exists to
// stop scripted abuse, not to throttle real users.
const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000, // requests per window per IP
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false,
});

// Login limiter - 5 attempts per 15 minutes
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: {
    success: false,
    message: 'Too many login attempts from this IP, please try again after 15 minutes.'
  },
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict limiter for password reset
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 requests per hour
  message: {
    success: false,
    message: 'Too many password reset attempts, please try again after an hour.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// OTP request limiter - stops email flooding via the employee portal
const otpRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 OTP emails per window per IP
  message: {
    success: false,
    message: 'Too many OTP requests. Please try again after 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// OTP verify limiter - stops brute-forcing the 6-digit code
const otpVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per window per IP
  message: {
    success: false,
    message: 'Too many OTP attempts. Please try again after 15 minutes.'
  },
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  apiLimiter,
  loginLimiter,
  passwordResetLimiter,
  otpRequestLimiter,
  otpVerifyLimiter
};
