const express = require('express');
const router = express.Router();
const {
  getAllPayslips,
  getPayslipById,
  generatePayslip,
  bulkGeneratePayslips,
  updatePaymentStatus,
  getPayslipSummary,
  getPayslipsByMonth,
  deletePayslipsByMonth
} = require('../controllers/payslipController');
const { authenticate, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// GET routes
router.get('/', getAllPayslips);
router.get('/summary', getPayslipSummary);
router.get('/month/:month', getPayslipsByMonth);
router.get('/:id', getPayslipById);

// POST routes - Admin/HR only
router.post('/generate', authorize('ADMIN', 'HR'), generatePayslip);
router.post('/generate/bulk', authorize('ADMIN', 'HR'), bulkGeneratePayslips);

// PUT routes - Admin/HR only
router.put('/:id/payment-status', authorize('ADMIN', 'HR'), updatePaymentStatus);

// DELETE routes - Admin/HR only
router.delete('/month/:month', authorize('ADMIN', 'HR'), deletePayslipsByMonth);

module.exports = router;
