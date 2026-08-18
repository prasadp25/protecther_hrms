const { executeQuery, withTransaction } = require('../config/database');
const { calculatePayslip } = require('../utils/payslipCalculator');
const { getCompanyFilter } = require('../middleware/auth');
const { computeRecoveries, recordRecoveries } = require('../utils/advanceRecovery');

// Single canonical payslip INSERT, used by both single- and bulk-generate so a
// schema/column change only happens in one place.
const PAYSLIP_INSERT_SQL = `
  INSERT INTO payslips (
    employee_id, salary_id, month,
    total_working_days, total_days_in_month, days_present, days_absent,
    basic_salary, hra, other_allowances, bonus, gratuity, gross_salary,
    fixed_basic, fixed_hra, fixed_incentive, fixed_gross, fixed_net,
    pf_deduction, esi_deduction, professional_tax, mediclaim_deduction,
    advance_deduction, other_deductions, total_deductions,
    net_salary, net_payable_with_bonus, payment_status, remarks
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`;

// Insert one payslip row (within a transaction) from a calculatePayslip() result.
// Returns the new payslip_id.
const insertPayslipRow = async (conn, { employeeId, salaryId, monthStr, daysInMonth, actualDaysPresent, calc, paymentStatus = 'PENDING', remarks = null }) => {
  const [result] = await conn.query(PAYSLIP_INSERT_SQL, [
    employeeId, salaryId, monthStr,
    calc.totalWorkingDays, daysInMonth, actualDaysPresent, calc.daysAbsent,
    calc.actualBasic, calc.actualHra, calc.actualAllowance + calc.actualIncentive,
    calc.bonus, calc.gratuity, calc.actualGross,
    calc.fixedBasic, calc.fixedHra, calc.fixedAllowance + calc.fixedIncentive,
    calc.fixedGross, calc.fixedNetSalary,
    calc.pfDeduction, calc.esiDeduction, calc.professionalTax, calc.mediclaimDeduction,
    calc.advanceDeduction, calc.otherDeductions, calc.totalDeductions,
    calc.netSalary, calc.netPayableWithBonus, paymentStatus, remarks,
  ]);
  return result.insertId;
};

// ==============================================
// GET ALL PAYSLIPS
// ==============================================
const getAllPayslips = async (req, res) => {
  try {
    const { month, year, site_id, employee_id, payment_status } = req.query;
    const companyId = getCompanyFilter(req);

    let query = `
      SELECT DISTINCT p.*, e.employee_code, e.first_name, e.last_name, e.designation,
             e.ifsc_code, CONCAT('XXXX', RIGHT(e.account_number, 4)) as account_number,
             st.site_name, st.site_code
      FROM payslips p
      JOIN employees e ON p.employee_id = e.employee_id
      LEFT JOIN sites st ON e.site_id = st.site_id
      WHERE 1=1
    `;
    const params = [];

    // Company filter derived from the authenticated user (not client input)
    if (companyId) {
      query += ' AND e.company_id = ?';
      params.push(companyId);
    }

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
      message: 'Failed to fetch payslips'
    });
  }
};

// ==============================================
// GET PAYSLIP BY ID
// ==============================================
const getPayslipById = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = getCompanyFilter(req);

    let query = `
      SELECT p.*, e.employee_code, e.first_name, e.last_name, e.designation,
             e.mobile, e.ifsc_code, e.bank_name, e.company_id,
             CONCAT('XXXX', RIGHT(e.account_number, 4)) as account_number_masked,
             st.site_name, st.site_code
      FROM payslips p
      JOIN employees e ON p.employee_id = e.employee_id
      LEFT JOIN sites st ON e.site_id = st.site_id
      WHERE p.payslip_id = ?
    `;
    const params = [id];

    // Company filter derived from the authenticated user (not client input)
    if (companyId) {
      query += ' AND e.company_id = ?';
      params.push(companyId);
    }

    const payslips = await executeQuery(query, params);

    if (payslips.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Payslip not found'
      });
    }

    // Use masked account number
    const payslip = payslips[0];
    payslip.account_number = payslip.account_number_masked;
    delete payslip.account_number_masked;

    res.status(200).json({
      success: true,
      data: payslip
    });
  } catch (error) {
    console.error('Get payslip error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payslip'
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
      'SELECT employee_id, date_of_joining FROM employees WHERE employee_id = ? AND status = ?',
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

    // Waive Professional Tax when this payslip covers the employee's joining
    // month (company policy: no PT for a partial joining-month stub period)
    const isJoiningMonth = employee[0].date_of_joining && employee[0].date_of_joining.slice(0, 7) === monthStr;

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
      'SELECT days_present, total_days_in_month, status FROM attendance WHERE employee_id = ? AND attendance_month = ?',
      [employee_id, monthStr]
    );

    if (attendance.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No attendance record found for this employee for the specified month. Please mark attendance first.'
      });
    }

    const attendanceData = attendance[0];

    // Check if attendance is finalized
    if (attendanceData.status !== 'FINALIZED') {
      return res.status(400).json({
        success: false,
        message: 'Attendance must be FINALIZED before generating payslip. Please finalize attendance first.'
      });
    }

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
    const daysInMonth = attendanceData.total_days_in_month;
    const actualDaysPresent = attendanceData.days_present;

    // Advance recovery, payslip insert, and the recovery ledger are done in one
    // transaction so a partial failure can't half-recover. The SALARY ADVANCE
    // deduction is now driven by tracked advances (auto-recovery), not a manual
    // field.
    const { payslipId, calc } = await withTransaction(async (conn) => {
      // No pay this month (fully absent) → don't recover advances from zero pay.
      const { recoveries, total: advanceDeduction } = actualDaysPresent > 0
        ? await computeRecoveries(conn, employee_id)
        : { recoveries: [], total: 0 };
      const calc = calculatePayslip(salaryData, actualDaysPresent, daysInMonth, advanceDeduction, isJoiningMonth);

      const payslipId = await insertPayslipRow(conn, {
        employeeId: employee_id, salaryId: salaryData.salary_id, monthStr,
        daysInMonth, actualDaysPresent, calc, remarks: remarks || null,
      });
      await recordRecoveries(conn, payslipId, monthStr, recoveries);
      return { payslipId, calc };
    });

    res.status(201).json({
      success: true,
      message: 'Payslip generated successfully',
      data: {
        payslip_id: payslipId,
        gross_salary: calc.actualGross,
        net_salary: calc.netSalary,
        advance_recovered: calc.advanceDeduction
      }
    });
  } catch (error) {
    console.error('Generate payslip error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate payslip'
    });
  }
};

// ==============================================
// BULK GENERATE PAYSLIPS
// ==============================================
const bulkGeneratePayslips = async (req, res) => {
  try {
    const { month, year, site_id, regenerate } = req.body;
    // Company scope: own company for ADMIN/HR; SUPER_ADMIN may target one via body/query
    const companyId = req.user.role === 'SUPER_ADMIN'
      ? (req.body.company_id || req.query.company_id || null)
      : req.user.company_id;

    // Validation
    if (!month || !year) {
      return res.status(400).json({
        success: false,
        message: 'Month and year are required'
      });
    }

    // Format month as YYYY-MM
    const monthStr = `${year}-${String(month).padStart(2, '0')}`;

    // Get all employees with FINALIZED attendance for this month
    let query = `
      SELECT DISTINCT e.employee_id, e.employee_code, e.first_name, e.last_name,
             e.date_of_joining, a.days_present, a.total_days_in_month
      FROM employees e
      INNER JOIN attendance a ON e.employee_id = a.employee_id
      WHERE e.status = 'ACTIVE'
        AND a.attendance_month = ?
        AND a.status = 'FINALIZED'
    `;
    const params = [monthStr];

    if (companyId) {
      query += ' AND e.company_id = ?';
      params.push(companyId);
    }

    if (site_id) {
      query += ' AND e.site_id = ?';
      params.push(site_id);
    }

    const employees = await executeQuery(query, params);

    if (employees.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No employees found with FINALIZED attendance for ${monthStr}. Please finalize attendance first.`
      });
    }

    const results = {
      success: 0,
      failed: 0,
      skipped: 0,
      regenerated: 0,
      errors: [],
      details: []
    };

    // Generate payslip for each employee
    for (const emp of employees) {
      try {
        // Check if payslip already exists
        const existing = await executeQuery(
          'SELECT payslip_id FROM payslips WHERE employee_id = ? AND month = ?',
          [emp.employee_id, monthStr]
        );

        if (existing.length > 0) {
          if (regenerate) {
            // Delete existing payslip and regenerate
            await executeQuery('DELETE FROM payslips WHERE payslip_id = ?', [existing[0].payslip_id]);
            results.regenerated++;
          } else {
            results.skipped++;
            results.details.push(`${emp.employee_code}: Skipped (payslip exists)`);
            continue;
          }
        }

        // Attendance data already loaded from join
        const actualDaysPresent = emp.days_present;
        const daysInMonth = emp.total_days_in_month;

        // Waive Professional Tax for the employee's joining month (company policy)
        const isJoiningMonth = emp.date_of_joining && emp.date_of_joining.slice(0, 7) === monthStr;

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

        // Auto-recover tracked advances + insert payslip + recovery ledger,
        // atomically per employee (same as the single-generate path).
        const calc = await withTransaction(async (conn) => {
          // No pay this month (fully absent) → don't recover advances from zero pay.
          const { recoveries, total: advanceDeduction } = actualDaysPresent > 0
            ? await computeRecoveries(conn, emp.employee_id)
            : { recoveries: [], total: 0 };
          const c = calculatePayslip(salaryData, actualDaysPresent, daysInMonth, advanceDeduction, isJoiningMonth);

          const payslipId = await insertPayslipRow(conn, {
            employeeId: emp.employee_id, salaryId: salaryData.salary_id, monthStr,
            daysInMonth, actualDaysPresent, calc: c,
          });
          await recordRecoveries(conn, payslipId, monthStr, recoveries);
          return c;
        });

        results.success++;
        results.details.push(`${emp.employee_code} (${emp.first_name}): ₹${calc.netSalary}`);
      } catch (err) {
        results.failed++;
        results.errors.push(`${emp.employee_code}: ${err.message}`);
      }
    }

    const totalProcessed = results.success + results.regenerated;
    res.status(200).json({
      success: true,
      message: `Generated ${totalProcessed} payslips (${results.regenerated} regenerated, ${results.skipped} skipped, ${results.failed} failed)`,
      data: results
    });
  } catch (error) {
    console.error('Bulk generate payslips error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to bulk generate payslips'
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
      message: 'Failed to update payment status'
    });
  }
};

// ==============================================
// GET PAYSLIP SUMMARY
// ==============================================
const getPayslipSummary = async (req, res) => {
  try {
    const { month, year, site_id } = req.query;
    const companyId = getCompanyFilter(req);

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

    if (companyId) {
      query += ' AND e.company_id = ?';
      params.push(companyId);
    }

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
      message: 'Failed to fetch payslip summary'
    });
  }
};

// ==============================================
// GET PAYSLIPS BY MONTH
// ==============================================
const getPayslipsByMonth = async (req, res) => {
  try {
    const { month } = req.params; // Format: YYYY-MM
    const companyId = getCompanyFilter(req);

    let query = `
      SELECT p.*, e.employee_code, e.first_name, e.last_name, e.designation,
             st.site_name, st.site_code
      FROM payslips p
      JOIN employees e ON p.employee_id = e.employee_id
      LEFT JOIN sites st ON e.site_id = st.site_id
      WHERE p.month = ?
    `;
    const params = [month];

    // Company filter derived from the authenticated user (not client input)
    if (companyId) {
      query += ' AND e.company_id = ?';
      params.push(companyId);
    }

    query += ' ORDER BY st.site_name, e.employee_code';

    const payslips = await executeQuery(query, params);

    res.status(200).json({
      success: true,
      count: payslips.length,
      data: payslips
    });
  } catch (error) {
    console.error('Get payslips by month error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payslips by month'
    });
  }
};

// ==============================================
// DELETE PAYSLIPS BY MONTH
// ==============================================
const deletePayslipsByMonth = async (req, res) => {
  try {
    const { month } = req.params; // Format: YYYY-MM
    const companyId = getCompanyFilter(req);

    if (!/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid month format. Expected YYYY-MM'
      });
    }

    // Scope the delete to the user's company via the employees join
    let query = `
      DELETE p FROM payslips p
      JOIN employees e ON p.employee_id = e.employee_id
      WHERE p.month = ?
    `;
    const params = [month];

    if (companyId) {
      query += ' AND e.company_id = ?';
      params.push(companyId);
    }

    const result = await executeQuery(query, params);

    res.status(200).json({
      success: true,
      message: `Deleted ${result.affectedRows} payslips for ${month}`,
      deletedCount: result.affectedRows
    });
  } catch (error) {
    console.error('Delete payslips by month error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete payslips'
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
  deletePayslipsByMonth,
  // exported for tests
  insertPayslipRow,
};
