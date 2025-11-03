const express = require('express');
const router = express.Router();
const {
  getAttendance,
  markAttendance,
  bulkMarkAttendance,
  updateAttendance,
  getEmployeeAttendance,
  getAttendanceReport,
  getDailyAttendanceSummary
} = require('../controllers/attendanceController');
const { authenticate, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// GET routes
router.get('/', getAttendance);
router.get('/report', getAttendanceReport);
router.get('/summary/daily', getDailyAttendanceSummary);
router.get('/employee/:id', getEmployeeAttendance);

// POST routes - Admin/HR only
router.post('/mark', authorize('ADMIN', 'HR'), markAttendance);
router.post('/mark/bulk', authorize('ADMIN', 'HR'), bulkMarkAttendance);

// PUT routes - Admin/HR only
router.put('/:id', authorize('ADMIN', 'HR'), updateAttendance);

module.exports = router;
