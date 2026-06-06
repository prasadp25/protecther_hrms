const express = require('express');
const router = express.Router();
const {
  getAttendanceByMonth,
  getEmployeeAttendance,
  saveAttendance,
  finalizeAttendance,
  unfinalizeAttendance,
  deleteAttendance,
  getAttendanceSummary
} = require('../controllers/attendanceController');
const { authenticate, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// GET routes - All authenticated users can view
router.get('/month/:month', getAttendanceByMonth);  // GET /api/v1/attendance/month/2025-01
router.get('/employee/:employeeId', getEmployeeAttendance);  // GET /api/v1/attendance/employee/1
router.get('/summary/:month', getAttendanceSummary);  // GET /api/v1/attendance/summary/2025-01

// POST routes - Admin/HR only
router.post('/save', authorize('ADMIN', 'HR'), saveAttendance);  // POST /api/v1/attendance/save
router.post('/finalize', authorize('ADMIN', 'HR'), finalizeAttendance);  // POST /api/v1/attendance/finalize
router.post('/unfinalize', authorize('ADMIN', 'HR'), unfinalizeAttendance);  // POST /api/v1/attendance/unfinalize

// DELETE routes - Admin/HR only
router.delete('/:attendanceId', authorize('ADMIN', 'HR'), deleteAttendance);  // DELETE /api/v1/attendance/1

module.exports = router;
