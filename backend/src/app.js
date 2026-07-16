const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const app = express();

// Production runs behind the Cloudflare tunnel (one proxy hop). Trusting it
// makes req.ip the real client IP from X-Forwarded-For, so rate limits apply
// per visitor instead of lumping everyone into the tunnel's single IP.
app.set('trust proxy', 1);

// ==============================================
// CORS Configuration - Whitelist specific origins
// ==============================================
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
  : [
      'http://localhost:5173',
      'http://localhost:8000',
      'http://192.168.1.36:8000',
      'https://hr.protecther.in'
    ];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
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
  crossOriginResourcePolicy: { policy: 'same-origin' },
  crossOriginOpenerPolicy: { policy: 'same-origin' }
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
// Rate Limiting (global ceiling; stricter per-route limiters in routes)
// ==============================================
const { apiLimiter } = require('./middleware/rateLimiter');

// ==============================================
// API Routes
// ==============================================
const apiPrefix = process.env.API_PREFIX || '/api/v1';
app.use(apiPrefix, apiLimiter);

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
const candidateRoutes = require('./routes/candidateRoutes');
const employeePortalRoutes = require('./routes/employeePortalRoutes');
const noticeRoutes = require('./routes/noticeRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const ecrRoutes = require('./routes/ecrRoutes');

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
app.use(`${apiPrefix}/candidates`, candidateRoutes);
app.use(`${apiPrefix}/employee-portal`, employeePortalRoutes);
app.use(`${apiPrefix}/notices`, noticeRoutes);
app.use(`${apiPrefix}/settings`, settingsRoutes);
app.use(`${apiPrefix}/ecr`, ecrRoutes);

// ==============================================
// Static Files (must be after API routes)
// ==============================================
// Only employee photos are public (rendered in <img> tags).
// Identity documents (Aadhaar/PAN/offer letters) are served through
// authenticated endpoints: /employees/:id/documents/:type and
// /employee-portal/documents/:type/download
app.use('/uploads/employee-photos', express.static(path.join(__dirname, '../uploads/employee-photos')));

// ==============================================
// Error Handling Middleware (must be last)
// ==============================================
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// 404 Handler - catches all unmatched routes
app.use(notFoundHandler);

// Global Error Handler - handles all errors
app.use(errorHandler);

module.exports = app;
