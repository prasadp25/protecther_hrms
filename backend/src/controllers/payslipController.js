const { executeQuery } = require('../config/database');

// ==============================================
// GET ALL PAYSLIPS
// ==============================================
const getAllPayslips = async (req, res) => {
  try {
    const { month, year, site_id, employee_id, payment_status } = req.query;

    let query = `
      SELECT p.*, e.employee_code, e.first_name, e.last_name, e.designation,
             st.site_name, st.site_code
      FROM payslips p
      JOIN employees e ON p.employee_id = e.employee_id
      LEFT JOIN sites st ON e.site_id = st.site_id
      WHERE 1=1
    `;
    const params = [];

    // Add filters
    // Note: month column in DB is in YYYY-MM format
    if (month && year) {
      // If both provided, create YYYY-MM format
      query += ' AND p.month = ?';
      params.push(`${year}-${String(month).padStart(2, '0')}`);
    } else if (month) {
      // If only month provided, match the month part
      query += ' AND SUBSTRING(p.month, 6, 2) = ?';
      params.push(String(month).padStart(2, '0'));
    } else if (year) {
      // If only year provided, match the year part
      query += ' AND SUBSTRING(p.month, 1, 4) = ?';
      params.push(year);
    }

    if (site_id) {
      query += ' AND e.site_id = ?';
      params.push(site_id);
    }

    if (employee_id) {
      query += ' AND p.employee_id = ?';
      params.push(employee_id);
    }

    if (payment_status) {
      query += ' AND p.payment_status = ?';
      params.push(payment_status);
    }

    query += ' ORDER BY p.month DESC, e.first_name';

    const payslips = await executeQuery(query, params);

    res.status(200).json({
      success: true,
      count: payslips.length,
      data: payslips
    });
  } catch (error) {
    console.error('Get payslips error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payslips',
      error: error.message
    });
  }
};

// ==============================================
// GET PAYSLIP BY ID
// ==============================================
const getPayslipById = async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT p.*, e.employee_code, e.first_name, e.last_name, e.designation,
             e.mobile, e.account_number, e.ifsc_code, e.bank_name,
             st.site_name, st.site_code
      FROM payslips p
      JOIN employees e ON p.employee_id = e.employee_id
      LEFT JOIN sites st ON e.site_id = st.site_id
      WHERE p.payslip_id = ?
    `;

    const payslips = await executeQuery(query, [id]);

    if (payslips.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Payslip not found'
      });
    }

    res.status(200).json({
      success: true,
      data: payslips[0]
    });
  } catch (error) {
    console.error('Get payslip error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payslip',
      error: error.message
    });
  }
};

// ==============================================
// GENERATE PAYSLIP
// ==============================================
const generatePayslip = async (req, res) => {
  try {
    const { employee_id, month, year, advance_deduction, remarks } = req.body;

    // Validation
    if (!employee_id || !month || !year) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID, month, and year are required'
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

    // Format month as YYYY-MM
    const monthStr = `${year}-${String(month).padStart(2, '0')}`;

    // Check if payslip already exists
    const existing = await executeQuery(
      'SELECT payslip_id FROM payslips WHERE employee_id = ? AND month = ?',
      [employee_id, monthStr]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Payslip already exists for this month'
      });
    }

    // Get attendance data from attendance table
    const attendance = await executeQuery(
      'SELECT days_present, total_days_in_month FROM attendance WHERE employee_id = ? AND attendance_month = ?',
      [employee_id, monthStr]
    );

    if (attendance.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No attendance record found for this employee for the specified month. Please mark attendance first.'
      });
    }

    const attendanceData = attendance[0];

    // Get active salary structure
    const salary = await executeQuery(
      'SELECT * FROM salaries WHERE employee_id = ? AND status = ? ORDER BY effective_from DESC LIMIT 1',
      [employee_id, 'ACTIVE']
    );

    if (salary.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No active salary structure found for this employee'
      });
    }

    const salaryData = salary[0];

    // Calculate working days for the month (Calendar days)
    const daysInMonth = attendanceData.total_days_in_month; // Calendar days from attendance (30/31)
    const totalWorkingDays = daysInMonth; // Use calendar days for calculation

    // Days present from attendance record
    const actualDaysPresent = attendanceData.days_present;
    const daysAbsent = daysInMonth - actualDaysPresent;

    // Fixed Salary Components (from salary structure)
    const fixedBasic = parseFloat(salaryData.basic_salary);
    const fixedHra = parseFloat(salaryData.hra || 0);
    const fixedAllowance = parseFloat(salaryData.special_allowance || 0);
    const fixedIncentive = parseFloat(salaryData.incentive_allowance || salaryData.other_allowances || 0);
    const fixedGross = fixedBasic + fixedHra + fixedAllowance + fixedIncentive;

    // Fixed Deductions (constant regardless of attendance)
    const pfDeduction = parseFloat(salaryData.pf_deduction || 0);
    const esiDeduction = parseFloat(salaryData.esi_deduction || 0);
    const professionalTax = parseFloat(salaryData.professional_tax || 0);
    const mediclaimDeduction = parseFloat(salaryData.mediclaim_deduction || 0);
    const advanceDeduction = parseFloat(advance_deduction || 0);
    const otherDeductions = parseFloat(salaryData.other_deductions || 0);

    const totalDeductions = pfDeduction + esiDeduction + professionalTax + mediclaimDeduction + advanceDeduction + otherDeductions;

    // NEW FORMULA: Net Payable = ((Gross - Deductions) / Days in Month) × Days Present
    const netSalary = Math.round(((fixedGross - totalDeductions) / daysInMonth) * actualDaysPresent);

    // Calculate actual (prorated) components for display
    const actualBasic = Math.round((fixedBasic / daysInMonth) * actualDaysPresent);
    const actualHra = Math.round((fixedHra / daysInMonth) * actualDaysPresent);
    const actualAllowance = Math.round((fixedAllowance / daysInMonth) * actualDaysPresent);
    const actualIncentive = Math.round((fixedIncentive / daysInMonth) * actualDaysPresent);
    const actualGross = actualBasic + actualHra + actualAllowance + actualIncentive;

    // Insert payslip
    const query = `
      INSERT INTO payslips (
        employee_id, salary_id, month,
        total_working_days, total_days_in_month, days_present, days_absent,
        basic_salary, hra, allowance, other_allowances, gross_salary,
        pf_deduction, esi_deduction, professional_tax, mediclaim_deduction,
        advance_deduction, other_deductions, total_deductions,
        net_salary, payment_status, remarks
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      employee_id,
      salaryData.salary_id,
      monthStr,
      totalWorkingDays,
      daysInMonth,
      actualDaysPresent,
      daysAbsent,
      actualBasic,  // Actual (prorated) basic
      actualHra,     // Actual (prorated) HRA
      actualAllowance, // Actual (prorated) allowance
      actualIncentive, // Actual (prorated) incentive
      actualGross,   // Actual (prorated) gross
      pfDeduction,
      esiDeduction,
      professionalTax,
      mediclaimDeduction,
      advanceDeduction,
      otherDeductions,
      totalDeductions,
      netSalary,
      'PENDING',
      remarks || null
    ];

    const result = await executeQuery(query, params);

    res.status(201).json({
      success: true,
      message: 'Payslip generated successfully',
      data: {
        payslip_id: result.insertId,
        gross_salary: actualGross,
        net_salary: netSalary
      }
    });
  } catch (error) {
    console.error('Generate payslip error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate payslip',
      error: error.message
    });
  }
};

// ==============================================
// BULK GENERATE PAYSLIPS
// ==============================================
const bulkGeneratePayslips = async (req, res) => {
  try {
    const { month, year, site_id } = req.body;

    // Validation
    if (!month || !year) {
      return res.status(400).json({
        success: false,
        message: 'Month and year are required'
      });
    }

    // Get all active employees
    let employeeQuery = 'SELECT employee_id FROM employees WHERE status = ?';
    const employeeParams = ['ACTIVE'];

    if (site_id) {
      employeeQuery += ' AND site_id = ?';
      employeeParams.push(site_id);
    }

    const employees = await executeQuery(employeeQuery, employeeParams);

    if (employees.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No active employees found'
      });
    }

    const results = {
      success: 0,
      failed: 0,
      skipped: 0,
      errors: []
    };

    // Format month as YYYY-MM
    const monthStr = `${year}-${String(month).padStart(2, '0')}`;

    // Generate payslip for each employee
    for (const emp of employees) {
      try {
        // Check if payslip already exists
        const existing = await executeQuery(
          'SELECT payslip_id FROM payslips WHERE employee_id = ? AND month = ?',
          [emp.employee_id, monthStr]
        );

        if (existing.length > 0) {
          results.skipped++;
          continue;
        }

        // Get attendance from attendance table
        const attendance = await executeQuery(
          'SELECT days_present, total_days_in_month FROM attendance WHERE employee_id = ? AND attendance_month = ?',
          [emp.employee_id, monthStr]
        );

        if (attendance.length === 0) {
          results.failed++;
          results.errors.push(`Employee ${emp.employee_id}: No attendance record found for ${monthStr}`);
          continue;
        }

        const attendanceData = attendance[0];
        const actualDaysPresent = attendanceData.days_present;
        const daysInMonth = attendanceData.total_days_in_month;

        // Call generatePayslip logic
        const salary = await executeQuery(
          'SELECT * FROM salaries WHERE employee_id = ? AND status = ? ORDER BY effective_from DESC LIMIT 1',
          [emp.employee_id, 'ACTIVE']
        );

        if (salary.length === 0) {
          results.failed++;
          results.errors.push(`No salary structure for employee ${emp.employee_id}`);
          continue;
        }

        const salaryData = salary[0];
        const totalWorkingDays = daysInMonth; // Use calendar days for calculation
        const daysAbsent = daysInMonth - actualDaysPresent;

        // Fixed Salary Components (from salary structure)
        const fixedBasic = parseFloat(salaryData.basic_salary);
        const fixedHra = parseFloat(salaryData.hra || 0);
        const fixedAllowance = parseFloat(salaryData.special_allowance || 0);
        const fixedIncentive = parseFloat(salaryData.incentive_allowance || salaryData.other_allowances || 0);
        const fixedGross = fixedBasic + fixedHra + fixedAllowance + fixedIncentive;

        // Fixed Deductions
        const pfDeduction = parseFloat(salaryData.pf_deduction || 0);
        const esiDeduction = parseFloat(salaryData.esi_deduction || 0);
        const professionalTax = parseFloat(salaryData.professional_tax || 0);
        const mediclaimDeduction = parseFloat(salaryData.mediclaim_deduction || 0);
        const advanceDeduction = parseFloat(salaryData.advance_deduction || 0);
        const otherDeductions = parseFloat(salaryData.other_deductions || 0);

        const totalDeductions = pfDeduction + esiDeduction + professionalTax + mediclaimDeduction + advanceDeduction + otherDeductions;

        // NEW FORMULA: Net Payable = ((Gross - Deductions) / Days in Month) × Days Present
        const netSalary = Math.round(((fixedGross - totalDeductions) / daysInMonth) * actualDaysPresent);

        // Calculate actual (prorated) components for display
        const actualBasic = Math.round((fixedBasic / daysInMonth) * actualDaysPresent);
        const actualHra = Math.round((fixedHra / daysInMonth) * actualDaysPresent);
        const actualAllowance = Math.round((fixedAllowance / daysInMonth) * actualDaysPresent);
        const actualIncentive = Math.round((fixedIncentive / daysInMonth) * actualDaysPresent);
        const actualGross = actualBasic + actualHra + actualAllowance + actualIncentive;

        await executeQuery(
          `INSERT INTO payslips (
            employee_id, salary_id, month,
            total_working_days, total_days_in_month, days_present, days_absent,
            basic_salary, hra, allowance, other_allowances, gross_salary,
            pf_deduction, esi_deduction, professional_tax, mediclaim_deduction,
            advance_deduction, other_deductions, total_deductions,
            net_salary, payment_status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            emp.employee_id, salaryData.salary_id, monthStr,
            totalWorkingDays, daysInMonth, actualDaysPresent, daysAbsent,
            actualBasic, actualHra, actualAllowance, actualIncentive, actualGross,
            pfDeduction, esiDeduction, professionalTax, mediclaimDeduction,
            advanceDeduction, otherDeductions, totalDeductions,
            netSalary, 'PENDING'
          ]
        );

        results.success++;
      } catch (err) {
        results.failed++;
        results.errors.push(`Employee ${emp.employee_id}: ${err.message}`);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Bulk payslip generation completed',
      data: results
    });
  } catch (error) {
    console.error('Bulk generate payslips error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to bulk generate payslips',
      error: error.message
    });
  }
};

// ==============================================
// UPDATE PAYMENT STATUS
// ==============================================
const updatePaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { payment_status, payment_date, payment_method, payment_reference } = req.body;

    // Check if payslip exists
    const existing = await executeQuery(
      'SELECT payslip_id FROM payslips WHERE payslip_id = ?',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Payslip not found'
      });
    }

    const query = `
      UPDATE payslips
      SET payment_status = ?,
          payment_date = ?,
          payment_method = ?,
          payment_reference = ?
      WHERE payslip_id = ?
    `;

    await executeQuery(query, [
      payment_status,
      payment_date || null,
      payment_method || null,
      payment_reference || null,
      id
    ]);

    res.status(200).json({
      success: true,
      message: 'Payment status updated successfully'
    });
  } catch (error) {
    console.error('Update payment status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update payment status',
      error: error.message
    });
  }
};

// ==============================================
// GET PAYSLIP SUMMARY
// ==============================================
const getPayslipSummary = async (req, res) => {
  try {
    const { month, year, site_id } = req.query;

    let query = `
      SELECT
        COUNT(*) as total_payslips,
        SUM(gross_salary) as total_gross,
        SUM(total_deductions) as total_deductions,
        SUM(net_salary) as total_net,
        SUM(CASE WHEN payment_status = 'PAID' THEN net_salary ELSE 0 END) as total_paid,
        SUM(CASE WHEN payment_status = 'PENDING' THEN net_salary ELSE 0 END) as total_pending
      FROM payslips p
      JOIN employees e ON p.employee_id = e.employee_id
      WHERE 1=1
    `;
    const params = [];

    if (month && year) {
      const monthStr = `${year}-${String(month).padStart(2, '0')}`;
      query += ' AND p.month = ?';
      params.push(monthStr);
    } else if (month) {
      query += ' AND SUBSTRING(p.month, 6, 2) = ?';
      params.push(String(month).padStart(2, '0'));
    } else if (year) {
      query += ' AND SUBSTRING(p.month, 1, 4) = ?';
      params.push(year);
    }

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
    console.error('Get payslip summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payslip summary',
      error: error.message
    });
  }
};

// ==============================================
// GET PAYSLIPS BY MONTH
// ==============================================
const getPayslipsByMonth = async (req, res) => {
  try {
    const { month } = req.params; // Format: YYYY-MM

    const query = `
      SELECT p.*, e.employee_code, e.first_name, e.last_name, e.designation,
             st.site_name, st.site_code
      FROM payslips p
      JOIN employees e ON p.employee_id = e.employee_id
      LEFT JOIN sites st ON e.site_id = st.site_id
      WHERE p.month = ?
      ORDER BY st.site_name, e.employee_code
    `;

    const payslips = await executeQuery(query, [month]);

    res.status(200).json({
      success: true,
      count: payslips.length,
      data: payslips
    });
  } catch (error) {
    console.error('Get payslips by month error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payslips by month',
      error: error.message
    });
  }
};

// ==============================================
// DELETE PAYSLIPS BY MONTH
// ==============================================
const deletePayslipsByMonth = async (req, res) => {
  try {
    const { month } = req.params; // Format: YYYY-MM

    const query = 'DELETE FROM payslips WHERE month = ?';
    const result = await executeQuery(query, [month]);

    res.status(200).json({
      success: true,
      message: `Deleted ${result.affectedRows} payslips for ${month}`,
      deletedCount: result.affectedRows
    });
  } catch (error) {
    console.error('Delete payslips by month error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete payslips',
      error: error.message
    });
  }
};

module.exports = {
  getAllPayslips,
  getPayslipById,
  generatePayslip,
  bulkGeneratePayslips,
  updatePaymentStatus,
  getPayslipSummary,
  getPayslipsByMonth,
  deletePayslipsByMonth
};
