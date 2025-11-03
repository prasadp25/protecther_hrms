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

// GET routes
router.get('/', getAllSalaries);
router.get('/summary', getSalarySummary);
router.get('/report/site-wise', getSiteWiseSalaryReport);
router.get('/employee/:id', getSalaryByEmployeeId);
router.get('/:id', getSalaryById);

// POST routes - Admin/HR only
router.post('/', authorize('ADMIN', 'HR'), createSalary);

// PUT routes - Admin/HR only
router.put('/:id', authorize('ADMIN', 'HR'), updateSalary);

// DELETE routes - Admin only
router.delete('/:id', authorize('ADMIN'), deleteSalary);

module.exports = router;
