const express = require('express');
const router = express.Router();
const {
  getEmployeeAttendanceReport,
  getEmployeeSalaryReport,
  getSiteEmployeeReport,
  getSiteSalaryCostReport,
  getMonthlyPayrollReport,
  getAttendanceSummaryReport,
  getDesignationReport,
  getCustomDateRangeReport
} = require('../controllers/reportController');
const { authenticate } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');

// Apply authentication and rate limiting to all routes
router.use(authenticate);
router.use(apiLimiter);

// ===================================
// EMPLOYEE REPORTS
// ===================================
router.get('/employee/attendance', getEmployeeAttendanceReport);
router.get('/employee/salary', getEmployeeSalaryReport);
router.get('/designation', getDesignationReport);

// ===================================
// SITE REPORTS
// ===================================
router.get('/site/employees', getSiteEmployeeReport);
router.get('/site/salary-cost', getSiteSalaryCostReport);

// ===================================
// PAYROLL REPORTS
// ===================================
router.get('/payroll/monthly', getMonthlyPayrollReport);
router.get('/attendance/summary', getAttendanceSummaryReport);

// ===================================
// CUSTOM REPORTS
// ===================================
router.get('/custom/date-range', getCustomDateRangeReport);

module.exports = router;
