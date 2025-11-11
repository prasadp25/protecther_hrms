const express = require('express');
const router = express.Router();
const {
  getAttendanceByMonth,
  getEmployeeAttendance,
  saveAttendance,
  finalizeAttendance,
  deleteAttendance,
  getAttendanceSummary
} = require('../controllers/attendanceController');

// GET routes
router.get('/month/:month', getAttendanceByMonth);  // GET /api/v1/attendance/month/2025-01
router.get('/employee/:employeeId', getEmployeeAttendance);  // GET /api/v1/attendance/employee/1
router.get('/summary/:month', getAttendanceSummary);  // GET /api/v1/attendance/summary/2025-01

// POST routes
router.post('/save', saveAttendance);  // POST /api/v1/attendance/save
router.post('/finalize', finalizeAttendance);  // POST /api/v1/attendance/finalize

// DELETE routes
router.delete('/:attendanceId', deleteAttendance);  // DELETE /api/v1/attendance/1

module.exports = router;
