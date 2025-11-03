const { executeQuery } = require('../config/database');

// ==============================================
// GET ATTENDANCE RECORDS
// ==============================================
const getAttendance = async (req, res) => {
  try {
    const { employee_id, site_id, from_date, to_date, status } = req.query;

    let query = `
      SELECT a.*, e.employee_code, e.first_name, e.last_name, e.designation,
             st.site_name, st.site_code
      FROM attendance a
      JOIN employees e ON a.employee_id = e.employee_id
      LEFT JOIN sites st ON e.site_id = st.site_id
      WHERE 1=1
    `;
    const params = [];

    // Add filters
    if (employee_id) {
      query += ' AND a.employee_id = ?';
      params.push(employee_id);
    }

    if (site_id) {
      query += ' AND e.site_id = ?';
      params.push(site_id);
    }

    if (from_date) {
      query += ' AND a.attendance_date >= ?';
      params.push(from_date);
    }

    if (to_date) {
      query += ' AND a.attendance_date <= ?';
      params.push(to_date);
    }

    if (status) {
      query += ' AND a.status = ?';
      params.push(status);
    }

    query += ' ORDER BY a.attendance_date DESC, e.first_name';

    const attendance = await executeQuery(query, params);

    res.status(200).json({
      success: true,
      count: attendance.length,
      data: attendance
    });
  } catch (error) {
    console.error('Get attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch attendance records',
      error: error.message
    });
  }
};

// ==============================================
// MARK ATTENDANCE
// ==============================================
const markAttendance = async (req, res) => {
  try {
    const { employee_id, attendance_date, status, check_in_time, check_out_time, overtime_hours, remarks } = req.body;

    // Validation
    if (!employee_id || !attendance_date || !status) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID, attendance date, and status are required'
      });
    }

    // Check if employee exists
    const employee = await executeQuery(
      'SELECT employee_id FROM employees WHERE employee_id = ? AND status = ?',
      [employee_id, 'ACTIVE']
    );

    if (employee.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Active employee not found'
      });
    }

    // Check if attendance already marked for this date
    const existing = await executeQuery(
      'SELECT attendance_id FROM attendance WHERE employee_id = ? AND attendance_date = ?',
      [employee_id, attendance_date]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Attendance already marked for this date'
      });
    }

    // Calculate working hours if check-in and check-out provided
    let workingHours = null;
    if (check_in_time && check_out_time) {
      const checkIn = new Date(`${attendance_date} ${check_in_time}`);
      const checkOut = new Date(`${attendance_date} ${check_out_time}`);
      workingHours = (checkOut - checkIn) / (1000 * 60 * 60); // Convert to hours
    }

    const query = `
      INSERT INTO attendance (
        employee_id, attendance_date, status, check_in_time, check_out_time,
        working_hours, overtime_hours, remarks
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      employee_id,
      attendance_date,
      status,
      check_in_time || null,
      check_out_time || null,
      workingHours,
      overtime_hours || 0,
      remarks || null
    ];

    const result = await executeQuery(query, params);

    res.status(201).json({
      success: true,
      message: 'Attendance marked successfully',
      data: {
        attendance_id: result.insertId,
        working_hours: workingHours
      }
    });
  } catch (error) {
    console.error('Mark attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark attendance',
      error: error.message
    });
  }
};

// ==============================================
// BULK MARK ATTENDANCE
// ==============================================
const bulkMarkAttendance = async (req, res) => {
  try {
    const { attendance_records } = req.body;

    // Validation
    if (!attendance_records || !Array.isArray(attendance_records) || attendance_records.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Attendance records array is required'
      });
    }

    const results = {
      success: 0,
      failed: 0,
      skipped: 0,
      errors: []
    };

    for (const record of attendance_records) {
      try {
        const { employee_id, attendance_date, status, check_in_time, check_out_time, overtime_hours, remarks } = record;

        // Check if already marked
        const existing = await executeQuery(
          'SELECT attendance_id FROM attendance WHERE employee_id = ? AND attendance_date = ?',
          [employee_id, attendance_date]
        );

        if (existing.length > 0) {
          results.skipped++;
          continue;
        }

        // Calculate working hours
        let workingHours = null;
        if (check_in_time && check_out_time) {
          const checkIn = new Date(`${attendance_date} ${check_in_time}`);
          const checkOut = new Date(`${attendance_date} ${check_out_time}`);
          workingHours = (checkOut - checkIn) / (1000 * 60 * 60);
        }

        await executeQuery(
          `INSERT INTO attendance (
            employee_id, attendance_date, status, check_in_time, check_out_time,
            working_hours, overtime_hours, remarks
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            employee_id,
            attendance_date,
            status,
            check_in_time || null,
            check_out_time || null,
            workingHours,
            overtime_hours || 0,
            remarks || null
          ]
        );

        results.success++;
      } catch (err) {
        results.failed++;
        results.errors.push(`Employee ${record.employee_id} on ${record.attendance_date}: ${err.message}`);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Bulk attendance marking completed',
      data: results
    });
  } catch (error) {
    console.error('Bulk mark attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to bulk mark attendance',
      error: error.message
    });
  }
};

// ==============================================
// UPDATE ATTENDANCE
// ==============================================
const updateAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    const attendanceData = req.body;

    // Check if attendance record exists
    const existing = await executeQuery(
      'SELECT attendance_id FROM attendance WHERE attendance_id = ?',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found'
      });
    }

    // Recalculate working hours if times are updated
    if (attendanceData.check_in_time && attendanceData.check_out_time) {
      const existing = await executeQuery(
        'SELECT attendance_date FROM attendance WHERE attendance_id = ?',
        [id]
      );

      const date = existing[0].attendance_date;
      const checkIn = new Date(`${date} ${attendanceData.check_in_time}`);
      const checkOut = new Date(`${date} ${attendanceData.check_out_time}`);
      attendanceData.working_hours = (checkOut - checkIn) / (1000 * 60 * 60);
    }

    // Build update query dynamically
    const fields = [];
    const values = [];

    Object.keys(attendanceData).forEach(key => {
      if (attendanceData[key] !== undefined && key !== 'attendance_id' && key !== 'employee_id') {
        fields.push(`${key} = ?`);
        values.push(attendanceData[key]);
      }
    });

    if (fields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    values.push(id);

    const query = `UPDATE attendance SET ${fields.join(', ')} WHERE attendance_id = ?`;
    await executeQuery(query, values);

    res.status(200).json({
      success: true,
      message: 'Attendance updated successfully'
    });
  } catch (error) {
    console.error('Update attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update attendance',
      error: error.message
    });
  }
};

// ==============================================
// GET EMPLOYEE ATTENDANCE
// ==============================================
const getEmployeeAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    const { from_date, to_date } = req.query;

    let query = `
      SELECT a.*, e.employee_code, e.first_name, e.last_name
      FROM attendance a
      JOIN employees e ON a.employee_id = e.employee_id
      WHERE a.employee_id = ?
    `;
    const params = [id];

    if (from_date) {
      query += ' AND a.attendance_date >= ?';
      params.push(from_date);
    }

    if (to_date) {
      query += ' AND a.attendance_date <= ?';
      params.push(to_date);
    }

    query += ' ORDER BY a.attendance_date DESC';

    const attendance = await executeQuery(query, params);

    // Calculate summary
    const summary = {
      total_days: attendance.length,
      present: attendance.filter(a => a.status === 'PRESENT').length,
      absent: attendance.filter(a => a.status === 'ABSENT').length,
      halfday: attendance.filter(a => a.status === 'HALFDAY').length,
      leave: attendance.filter(a => a.status === 'LEAVE').length,
      total_overtime_hours: attendance.reduce((sum, a) => sum + (parseFloat(a.overtime_hours) || 0), 0)
    };

    res.status(200).json({
      success: true,
      count: attendance.length,
      data: attendance,
      summary: summary
    });
  } catch (error) {
    console.error('Get employee attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch employee attendance',
      error: error.message
    });
  }
};

// ==============================================
// GET ATTENDANCE REPORT
// ==============================================
const getAttendanceReport = async (req, res) => {
  try {
    const { site_id, from_date, to_date, month, year } = req.query;

    let query = `
      SELECT
        e.employee_id, e.employee_code, e.first_name, e.last_name, e.designation,
        st.site_name, st.site_code,
        COUNT(a.attendance_id) as total_days,
        SUM(CASE WHEN a.status = 'PRESENT' THEN 1 ELSE 0 END) as present_days,
        SUM(CASE WHEN a.status = 'ABSENT' THEN 1 ELSE 0 END) as absent_days,
        SUM(CASE WHEN a.status = 'HALFDAY' THEN 0.5 ELSE 0 END) as halfday_count,
        SUM(CASE WHEN a.status = 'LEAVE' THEN 1 ELSE 0 END) as leave_days,
        SUM(a.overtime_hours) as total_overtime_hours
      FROM employees e
      LEFT JOIN sites st ON e.site_id = st.site_id
      LEFT JOIN attendance a ON e.employee_id = a.employee_id
      WHERE e.status = 'ACTIVE'
    `;
    const params = [];

    if (site_id) {
      query += ' AND e.site_id = ?';
      params.push(site_id);
    }

    if (from_date && to_date) {
      query += ' AND a.attendance_date BETWEEN ? AND ?';
      params.push(from_date, to_date);
    } else if (month && year) {
      query += ' AND MONTH(a.attendance_date) = ? AND YEAR(a.attendance_date) = ?';
      params.push(month, year);
    }

    query += ' GROUP BY e.employee_id, e.employee_code, e.first_name, e.last_name, e.designation, st.site_name, st.site_code';
    query += ' ORDER BY st.site_name, e.first_name';

    const report = await executeQuery(query, params);

    res.status(200).json({
      success: true,
      count: report.length,
      data: report
    });
  } catch (error) {
    console.error('Get attendance report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch attendance report',
      error: error.message
    });
  }
};

// ==============================================
// GET DAILY ATTENDANCE SUMMARY
// ==============================================
const getDailyAttendanceSummary = async (req, res) => {
  try {
    const { date, site_id } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date is required'
      });
    }

    let query = `
      SELECT
        COUNT(DISTINCT e.employee_id) as total_employees,
        COUNT(CASE WHEN a.status = 'PRESENT' THEN 1 END) as present,
        COUNT(CASE WHEN a.status = 'ABSENT' THEN 1 END) as absent,
        COUNT(CASE WHEN a.status = 'HALFDAY' THEN 1 END) as halfday,
        COUNT(CASE WHEN a.status = 'LEAVE' THEN 1 END) as on_leave,
        COUNT(DISTINCT e.employee_id) - COUNT(a.attendance_id) as not_marked
      FROM employees e
      LEFT JOIN attendance a ON e.employee_id = a.employee_id AND a.attendance_date = ?
      WHERE e.status = 'ACTIVE'
    `;
    const params = [date];

    if (site_id) {
      query += ' AND e.site_id = ?';
      params.push(site_id);
    }

    const summary = await executeQuery(query, params);

    res.status(200).json({
      success: true,
      data: summary[0]
    });
  } catch (error) {
    console.error('Get daily attendance summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch daily attendance summary',
      error: error.message
    });
  }
};

module.exports = {
  getAttendance,
  markAttendance,
  bulkMarkAttendance,
  updateAttendance,
  getEmployeeAttendance,
  getAttendanceReport,
  getDailyAttendanceSummary
};
