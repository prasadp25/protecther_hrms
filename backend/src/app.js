const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

const app = express();

// ==============================================
// Security Middleware
// ==============================================
app.use(helmet());

// ==============================================
// CORS Configuration
// ==============================================
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:5174',
  credentials: process.env.CORS_CREDENTIALS === 'true',
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// ==============================================
// Body Parser Middleware
// ==============================================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ==============================================
// Logging Middleware
// ==============================================
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// ==============================================
// API Routes
// ==============================================
const apiPrefix = process.env.API_PREFIX || '/api/v1';

// Health check endpoint
app.get(`${apiPrefix}/health`, (req, res) => {
  res.status(200).json({
    success: true,
    message: 'HRMS API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// Import routes
const authRoutes = require('./routes/authRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const siteRoutes = require('./routes/siteRoutes');
const salaryRoutes = require('./routes/salaryRoutes');
const payslipRoutes = require('./routes/payslipRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');

// Mount routes
app.use(`${apiPrefix}/auth`, authRoutes);
app.use(`${apiPrefix}/employees`, employeeRoutes);
app.use(`${apiPrefix}/sites`, siteRoutes);
app.use(`${apiPrefix}/salaries`, salaryRoutes);
app.use(`${apiPrefix}/payslips`, payslipRoutes);
app.use(`${apiPrefix}/attendance`, attendanceRoutes);

// ==============================================
// Static Files (must be after API routes)
// ==============================================
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ==============================================
// 404 Handler (must be last)
// ==============================================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl
  });
});

// ==============================================
// Global Error Handler
// ==============================================
app.use((err, req, res, next) => {
  console.error('Error:', err);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors: Object.values(err.errors).map(e => e.message)
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired'
    });
  }

  // Multer file upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: 'File size too large. Maximum size is 5MB.'
    });
  }

  // Default error
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

module.exports = app;
