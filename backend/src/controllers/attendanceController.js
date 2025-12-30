const { executeQuery } = require('../config/database');
const { logAttendanceFinalize } = require('../utils/auditLogger');

// ==============================================
// GET ATTENDANCE BY MONTH
// ==============================================
const getAttendanceByMonth = async (req, res) => {
  try {
    const { month } = req.params; // Format: YYYY-MM

    const query = `
      SELECT
        a.*,
        e.employee_code,
        e.first_name,
        e.last_name,
        e.designation,
        s.site_name,
        s.site_code,
        e.site_id
      FROM attendance a
      INNER JOIN employees e ON a.employee_id = e.employee_id
      LEFT JOIN sites s ON e.site_id = s.site_id
      WHERE a.attendance_month = ?
      ORDER BY s.site_name, e.first_name, e.last_name
    `;

    const results = await executeQuery(query, [month]);

    res.status(200).json({
      success: true,
      data: results,
      message: `Attendance records for ${month} retrieved successfully`
    });
  } catch (error) {
    console.error('Error fetching attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve attendance records',
      error: error.message
    });
  }
};

// ==============================================
// GET ATTENDANCE FOR EMPLOYEE
// ==============================================
const getEmployeeAttendance = async (req, res) => {
  try {
    const { employeeId } = req.params;

    const query = `
      SELECT
        a.*,
        e.employee_code,
        e.first_name,
        e.last_name
      FROM attendance a
      INNER JOIN employees e ON a.employee_id = e.employee_id
      WHERE a.employee_id = ?
      ORDER BY a.attendance_month DESC
      LIMIT 12
    `;

    const results = await executeQuery(query, [employeeId]);

    res.status(200).json({
      success: true,
      data: results,
      message: 'Employee attendance history retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching employee attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve employee attendance',
      error: error.message
    });
  }
};

// ==============================================
// SAVE ATTENDANCE (BULK)
// ==============================================
const saveAttendance = async (req, res) => {
  try {
    const { month, attendanceRecords } = req.body;

    if (!month || !attendanceRecords || !Array.isArray(attendanceRecords)) {
      return res.status(400).json({
        success: false,
        message: 'Month and attendance records array are required'
      });
    }

    // Validate month format
    const monthRegex = /^\d{4}-(0[1-9]|1[0-2])$/;
    if (!monthRegex.test(month)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid month format. Use YYYY-MM'
      });
    }

    // Calculate total days in month
    const [year, monthNum] = month.split('-');
    const totalDaysInMonth = new Date(year, monthNum, 0).getDate();

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (const record of attendanceRecords) {
      try {
        const { employee_id, days_present, remarks } = record;

        // Validate days_present
        if (days_present < 0 || days_present > totalDaysInMonth) {
          errors.push({
            employee_id,
            error: `Invalid days present (${days_present}). Must be between 0 and ${totalDaysInMonth}`
          });
          errorCount++;
          continue;
        }

        // Insert or update attendance
        const query = `
          INSERT INTO attendance
          (employee_id, attendance_month, days_present, total_days_in_month, remarks, status)
          VALUES (?, ?, ?, ?, ?, 'DRAFT')
          ON DUPLICATE KEY UPDATE
            days_present = VALUES(days_present),
            total_days_in_month = VALUES(total_days_in_month),
            remarks = VALUES(remarks),
            updated_at = CURRENT_TIMESTAMP
        `;

        await executeQuery(query, [
          employee_id,
          month,
          days_present,
          totalDaysInMonth,
          remarks || null
        ]);

        successCount++;
      } catch (err) {
        errors.push({
          employee_id: record.employee_id,
          error: err.message
        });
        errorCount++;
      }
    }

    res.status(200).json({
      success: true,
      message: `Attendance saved: ${successCount} successful, ${errorCount} failed`,
      stats: {
        total: attendanceRecords.length,
        successful: successCount,
        failed: errorCount
      },
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Error saving attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save attendance',
      error: error.message
    });
  }
};

// ==============================================
// FINALIZE ATTENDANCE
// ==============================================
const finalizeAttendance = async (req, res) => {
  try {
    const { month, site_id } = req.body;

    if (!month) {
      return res.status(400).json({
        success: false,
        message: 'Month is required'
      });
    }

    let query = `
      UPDATE attendance
      SET status = 'FINALIZED'
      WHERE attendance_month = ? AND status = 'DRAFT'
    `;
    const params = [month];

    if (site_id) {
      query += ' AND site_id = ?';
      params.push(site_id);
    }

    const result = await executeQuery(query, params);

    // Log audit trail
    await logAttendanceFinalize(month, site_id || 'all', result.affectedRows, req);

    res.status(200).json({
      success: true,
      message: `Attendance for ${month} finalized successfully`,
      recordsUpdated: result.affectedRows
    });
  } catch (error) {
    console.error('Error finalizing attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to finalize attendance',
      error: error.message
    });
  }
};

// ==============================================
// DELETE ATTENDANCE
// ==============================================
const deleteAttendance = async (req, res) => {
  try {
    const { attendanceId } = req.params;

    // Check if attendance is finalized
    const checkResult = await executeQuery(
      'SELECT status FROM attendance WHERE attendance_id = ?',
      [attendanceId]
    );

    if (checkResult.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found'
      });
    }

    if (checkResult[0].status === 'FINALIZED') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete finalized attendance record'
      });
    }

    const query = 'DELETE FROM attendance WHERE attendance_id = ?';
    await executeQuery(query, [attendanceId]);

    res.status(200).json({
      success: true,
      message: 'Attendance record deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete attendance record',
      error: error.message
    });
  }
};

// ==============================================
// GET ATTENDANCE SUMMARY
// ==============================================
const getAttendanceSummary = async (req, res) => {
  try {
    const { month } = req.params;

    const query = `
      SELECT
        COUNT(*) as total_employees,
        SUM(days_present) as total_days_present,
        AVG(days_present) as avg_days_present,
        MIN(days_present) as min_days_present,
        MAX(days_present) as max_days_present,
        MAX(total_days_in_month) as days_in_month
      FROM attendance
      WHERE attendance_month = ?
    `;

    const results = await executeQuery(query, [month]);

    res.status(200).json({
      success: true,
      data: results[0],
      message: 'Attendance summary retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching attendance summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve attendance summary',
      error: error.message
    });
  }
};

module.exports = {
  getAttendanceByMonth,
  getEmployeeAttendance,
  saveAttendance,
  finalizeAttendance,
  deleteAttendance,
  getAttendanceSummary
};

