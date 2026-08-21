const express = require('express');
const router = express.Router();
const {
  sendOTP,
  verifyOTP,
  authenticateEmployee,
  getProfile,
  getPayslips,
  getPayslipById,
  downloadPayslip,
  getNotices,
  getInsurance,
  getDocuments,
  downloadMyDocument
} = require('../controllers/employeePortalController');
const { applyLeave, myLeaves, withdrawLeave } = require('../controllers/leaveController');
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
router.get('/payslips/:id/download', authenticateEmployee, downloadPayslip);
router.get('/notices', authenticateEmployee, getNotices);
router.get('/insurance', authenticateEmployee, getInsurance);
router.get('/documents', authenticateEmployee, getDocuments);
router.get('/documents/:type/download', authenticateEmployee, downloadMyDocument);

// Leave self-service
router.get('/leaves', authenticateEmployee, myLeaves);
router.post('/leaves', authenticateEmployee, applyLeave);
router.post('/leaves/:id/withdraw', authenticateEmployee, withdrawLeave);

module.exports = router;
