const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const app = express();

// ==============================================
// Handle OPTIONS preflight FIRST (before any other middleware)
// ==============================================
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.header('Access-Control-Allow-Credentials', 'true');
    return res.sendStatus(200);
  }
  next();
});

// ==============================================
// CORS Configuration
// ==============================================
const corsOptions = {
  origin: true,
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};
app.use(cors(corsOptions));

// ==============================================
// Security Middleware
// ==============================================
app.use(helmet({
  crossOriginResourcePolicy: false,
  crossOriginOpenerPolicy: false
}));

// ==============================================
// Cookie Parser (must be before routes)
// ==============================================
app.use(cookieParser());

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
const companyRoutes = require('./routes/companyRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const siteRoutes = require('./routes/siteRoutes');
const salaryRoutes = require('./routes/salaryRoutes');
const payslipRoutes = require('./routes/payslipRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const reportRoutes = require('./routes/reportRoutes');
const auditRoutes = require('./routes/auditRoutes');

// Mount routes
app.use(`${apiPrefix}/auth`, authRoutes);
app.use(`${apiPrefix}/companies`, companyRoutes);
app.use(`${apiPrefix}/employees`, employeeRoutes);
app.use(`${apiPrefix}/sites`, siteRoutes);
app.use(`${apiPrefix}/salaries`, salaryRoutes);
app.use(`${apiPrefix}/payslips`, payslipRoutes);
app.use(`${apiPrefix}/attendance`, attendanceRoutes);
app.use(`${apiPrefix}/reports`, reportRoutes);
app.use(`${apiPrefix}/audit-logs`, auditRoutes);

// ==============================================
// Static Files (must be after API routes)
// ==============================================
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ==============================================
// Error Handling Middleware (must be last)
// ==============================================
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// 404 Handler - catches all unmatched routes
app.use(notFoundHandler);

// Global Error Handler - handles all errors
app.use(errorHandler);

module.exports = app;
