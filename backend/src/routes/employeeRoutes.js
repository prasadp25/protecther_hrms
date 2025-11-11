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
const { auditLog } = require('../middleware/auditLogger');

// All routes require authentication
router.use(authenticate);

// GET routes
router.get('/', getAllEmployees);
router.get('/active', getActiveEmployees);
router.get('/:id', getEmployeeById);

// POST routes - Admin/HR only with audit logging
router.post('/',
  authorize('ADMIN', 'HR'),
  uploadEmployeeDocuments,
  handleUploadError,
  auditLog('CREATE', 'employees'),
  createEmployee
);

// PUT routes - Admin/HR only with audit logging
router.put('/:id',
  authorize('ADMIN', 'HR'),
  uploadEmployeeDocuments,
  handleUploadError,
  auditLog('UPDATE', 'employees'),
  updateEmployee
);

// DELETE routes - Admin only with audit logging
router.delete('/:id',
  authorize('ADMIN'),
  auditLog('DELETE', 'employees'),
  deleteEmployee
);

module.exports = router;
