const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const app = express();

// ==============================================
// Security Middleware
// ==============================================
app.use(helmet());

// ==============================================
// Cookie Parser (must be before routes)
// ==============================================
app.use(cookieParser());

// ==============================================
// CORS Configuration (with credentials for cookies)
// ==============================================
const corsOptions = {
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'],
  credentials: true, // Allow cookies to be sent
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
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
// Custom logger to see ALL requests
app.use((req, res, next) => {
  console.log(`🌐 ${req.method} ${req.path} from ${req.ip}`);
  next();
});

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
const reportRoutes = require('./routes/reportRoutes');

// Mount routes
app.use(`${apiPrefix}/auth`, authRoutes);
app.use(`${apiPrefix}/employees`, employeeRoutes);
app.use(`${apiPrefix}/sites`, siteRoutes);
app.use(`${apiPrefix}/salaries`, salaryRoutes);
app.use(`${apiPrefix}/payslips`, payslipRoutes);
app.use(`${apiPrefix}/attendance`, attendanceRoutes);
app.use(`${apiPrefix}/reports`, reportRoutes);

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
