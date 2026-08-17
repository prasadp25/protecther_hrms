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

// GET routes - staff only (ADMIN/HR/MANAGER)
router.get('/month/:month', authorize('ADMIN', 'HR', 'MANAGER'), getAttendanceByMonth);
router.get('/employee/:employeeId', authorize('ADMIN', 'HR', 'MANAGER'), getEmployeeAttendance);
router.get('/summary/:month', authorize('ADMIN', 'HR', 'MANAGER'), getAttendanceSummary);

// POST routes - Admin/HR only
router.post('/save', authorize('ADMIN', 'HR'), saveAttendance);  // POST /api/v1/attendance/save
router.post('/finalize', authorize('ADMIN', 'HR'), finalizeAttendance);  // POST /api/v1/attendance/finalize
router.post('/unfinalize', authorize('ADMIN', 'HR'), unfinalizeAttendance);  // POST /api/v1/attendance/unfinalize

// DELETE routes - Admin/HR only
router.delete('/:attendanceId', authorize('ADMIN', 'HR'), deleteAttendance);  // DELETE /api/v1/attendance/1

module.exports = router;
