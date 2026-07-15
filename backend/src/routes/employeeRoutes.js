const express = require('express');
const router = express.Router();
const {
  getAllEmployees,
  getActiveEmployees,
  getEmployeesWithoutSalary,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getDepartments,
  getDesignations,
  getEmployeeDocument
} = require('../controllers/employeeController');
const { authenticate, authorize } = require('../middleware/auth');
const { uploadEmployeeDocuments, handleUploadError } = require('../middleware/upload');
const { auditLog } = require('../middleware/auditLogger');

// All routes require authentication
router.use(authenticate);

// GET routes - Admin/HR only (responses contain PII)
router.get('/', authorize('ADMIN', 'HR'), getAllEmployees);
router.get('/active', authorize('ADMIN', 'HR'), getActiveEmployees);
router.get('/without-salary', authorize('ADMIN', 'HR'), getEmployeesWithoutSalary);
router.get('/departments', authorize('ADMIN', 'HR'), getDepartments);
router.get('/designations', authorize('ADMIN', 'HR'), getDesignations);
router.get('/:id/documents/:type', authorize('ADMIN', 'HR'), getEmployeeDocument);
router.get('/:id', authorize('ADMIN', 'HR'), getEmployeeById);

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
