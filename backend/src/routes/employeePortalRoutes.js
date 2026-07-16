const express = require('express');
const router = express.Router();
const {
  sendOTP,
  verifyOTP,
  authenticateEmployee,
  getProfile,
  getPayslips,
  getPayslipById,
  getNotices,
  getInsurance,
  getDocuments,
  downloadMyDocument
} = require('../controllers/employeePortalController');
const { otpRequestLimiter, otpVerifyLimiter } = require('../middleware/rateLimiter');

// ==============================================
// PUBLIC ROUTES (No auth required, rate limited)
// ==============================================
router.post('/send-otp', otpRequestLimiter, sendOTP);
router.post('/verify-otp', otpVerifyLimiter, verifyOTP);

// ==============================================
// PROTECTED ROUTES (Employee auth required)
// ==============================================
router.get('/profile', authenticateEmployee, getProfile);
router.get('/payslips', authenticateEmployee, getPayslips);
router.get('/payslips/:id', authenticateEmployee, getPayslipById);
router.get('/notices', authenticateEmployee, getNotices);
router.get('/insurance', authenticateEmployee, getInsurance);
router.get('/documents', authenticateEmployee, getDocuments);
router.get('/documents/:type/download', authenticateEmployee, downloadMyDocument);

module.exports = router;
