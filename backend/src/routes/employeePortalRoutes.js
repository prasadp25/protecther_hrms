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
  getDocuments
} = require('../controllers/employeePortalController');

// ==============================================
// PUBLIC ROUTES (No auth required)
// ==============================================
router.post('/send-otp', sendOTP);
router.post('/verify-otp', verifyOTP);

// ==============================================
// PROTECTED ROUTES (Employee auth required)
// ==============================================
router.get('/profile', authenticateEmployee, getProfile);
router.get('/payslips', authenticateEmployee, getPayslips);
router.get('/payslips/:id', authenticateEmployee, getPayslipById);
router.get('/notices', authenticateEmployee, getNotices);
router.get('/insurance', authenticateEmployee, getInsurance);
router.get('/documents', authenticateEmployee, getDocuments);

module.exports = router;
