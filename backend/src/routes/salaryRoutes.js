const express = require('express');
const router = express.Router();
const {
  getAllSalaries,
  getSalaryById,
  getSalaryByEmployeeId,
  createSalary,
  updateSalary,
  deleteSalary,
  getSalarySummary,
  getSiteWiseSalaryReport
} = require('../controllers/salaryController');
const { authenticate, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// GET routes - salary data is sensitive; restrict to ADMIN/HR/MANAGER
// (company scoping is already enforced inside the controller).
router.get('/', authorize('ADMIN', 'HR', 'MANAGER'), getAllSalaries);
router.get('/summary', authorize('ADMIN', 'HR', 'MANAGER'), getSalarySummary);
router.get('/report/site-wise', authorize('ADMIN', 'HR', 'MANAGER'), getSiteWiseSalaryReport);
router.get('/employee/:id', authorize('ADMIN', 'HR', 'MANAGER'), getSalaryByEmployeeId);
router.get('/:id', authorize('ADMIN', 'HR', 'MANAGER'), getSalaryById);

// POST routes - Admin/HR only
router.post('/', authorize('ADMIN', 'HR'), createSalary);

// PUT routes - Admin/HR only
router.put('/:id', authorize('ADMIN', 'HR'), updateSalary);

// DELETE routes - Admin only
router.delete('/:id', authorize('ADMIN'), deleteSalary);

module.exports = router;
