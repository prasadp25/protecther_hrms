const express = require('express');
const router = express.Router();
const {
  getAllEmployees,
  getActiveEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee
} = require('../controllers/employeeController');
const { authenticate, authorize } = require('../middleware/auth');
const { uploadEmployeeDocuments, handleUploadError } = require('../middleware/upload');

// All routes require authentication
router.use(authenticate);

// GET routes
router.get('/', getAllEmployees);
router.get('/active', getActiveEmployees);
router.get('/:id', getEmployeeById);

// POST routes - Admin/HR only
router.post('/', authorize('ADMIN', 'HR'), uploadEmployeeDocuments, handleUploadError, createEmployee);

// PUT routes - Admin/HR only
router.put('/:id', authorize('ADMIN', 'HR'), uploadEmployeeDocuments, handleUploadError, updateEmployee);

// DELETE routes - Admin only
router.delete('/:id', authorize('ADMIN'), deleteEmployee);

module.exports = router;
