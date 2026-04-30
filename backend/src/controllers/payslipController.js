const { executeQuery } = require('../config/database');

// ==============================================
// GET ALL PAYSLIPS
// ==============================================
const getAllPayslips = async (req, res) => {
  try {
    const { month, year, site_id, employee_id, payment_status, company_id } = req.query;

    let query = `
      SELECT DISTINCT p.*, e.employee_code, e.first_name, e.last_name, e.designation,
             e.ifsc_code, e.account_number,
             st.site_name, st.site_code
      FROM payslips p
      JOIN employees e ON p.employee_id = e.employee_id
      LEFT JOIN sites st ON e.site_id = st.site_id
      WHERE 1=1
    `;
    const params = [];

    // Filter by company_id (important for multi-company support)
    if (company_id) {
      query += ' AND e.company_id = ?';
      params.push(company_id);
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
    console.log('📝 Generate payslip request body:', JSON.stringify(req.body));
    const { employee_id, month, year, advance_deduction, remarks } = req.body;

    // Validation
    if (!employee_id || !month || !year) {
      console.log('❌ Validation failed - employee_id:', employee_id, 'month:', month, 'year:', year);
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
    const daysInMonth = attendanceData.total_days_in_month; // Calendar days from attendance (30/31)
    const totalWorkingDays = daysInMonth; // Use calendar days for calculation

    // Days present from attendance record
    const actualDaysPresent = attendanceData.days_present;
    const daysAbsent = daysInMonth - actualDaysPresent;

    // Fixed Salary Components (from salary structure)
    const fixedBasic = parseFloat(salaryData.basic_salary);
    const fixedHra = parseFloat(salaryData.hra || 0);
    const fixedAllowance = parseFloat(salaryData.special_allowance || 0);
    const fixedIncentiveRaw = parseFloat(salaryData.incentive_allowance || salaryData.other_allowances || 0);

    // Fixed bonus: 8.33% of min(basic, 7000) if basic <= 21000
    // Bonus is CARVED OUT from Other Allowances (not added on top)
    const fixedBonusEligible = fixedBasic <= 21000;
    const fixedBonusBase = Math.min(fixedBasic, 7000);
    const fixedBonus = fixedBonusEligible ? Math.round(fixedBonusBase * 0.0833) : 0;

    // Fixed gratuity: 4.81% of Basic (Payment of Gratuity Act 1972)
    // Formula: (Basic × 15) / 26 / 12 = Basic × 0.0481
    // Gratuity is CARVED OUT from Other Allowances (not added on top)
    const fixedGratuity = Math.round(fixedBasic * 0.0481);

    // Deduct bonus and gratuity from incentive/other allowances so total stays same as CTC
    const fixedIncentive = Math.max(0, fixedIncentiveRaw - fixedBonus - fixedGratuity);

    // Gross = Basic + HRA + Allowance + Incentive + Bonus + Gratuity = Original CTC (unchanged)
    const fixedGross = fixedBasic + fixedHra + fixedAllowance + fixedIncentive + fixedBonus + fixedGratuity;

    // Calculate actual (prorated) components
    const actualBasic = Math.round((fixedBasic / daysInMonth) * actualDaysPresent);
    const actualHra = Math.round((fixedHra / daysInMonth) * actualDaysPresent);
    const actualAllowance = Math.round((fixedAllowance / daysInMonth) * actualDaysPresent);

    // Bonus: Payment of Bonus Act 1965 - 8.33% of min(earned basic, 7000)
    // Bonus is CARVED OUT from Other Allowances (part of CTC, not extra)
    const bonusEligible = fixedBasic <= 21000;
    const bonusBase = Math.min(actualBasic, 7000);
    const bonus = bonusEligible ? Math.round(bonusBase * 0.0833) : 0;

    // Gratuity: 4.81% of Earned Basic (Payment of Gratuity Act 1972)
    // Gratuity is CARVED OUT from Other Allowances (part of CTC, not extra)
    const gratuity = Math.round(actualBasic * 0.0481);

    // Deduct bonus and gratuity from incentive so total gross stays same as prorated CTC
    const actualIncentiveRaw = Math.round((fixedIncentiveRaw / daysInMonth) * actualDaysPresent);
    const actualIncentive = Math.max(0, actualIncentiveRaw - bonus - gratuity);

    // Gross = Basic + HRA + Allowance + Incentive + Bonus + Gratuity = Prorated CTC (unchanged)
    const actualGross = actualBasic + actualHra + actualAllowance + actualIncentive + bonus + gratuity;

    // DEBUG: Log bonus and gratuity calculation
    console.log('=== BONUS & GRATUITY CALCULATION DEBUG ===');
    console.log('fixedIncentiveRaw:', fixedIncentiveRaw);
    console.log('bonus:', bonus);
    console.log('gratuity:', gratuity);
    console.log('actualIncentiveRaw:', actualIncentiveRaw);
    console.log('actualIncentive (after bonus & gratuity deduction):', actualIncentive);
    console.log('actualGross:', actualGross);
    console.log('==========================================');

    // PF Calculation: 12% of Earned Basic (as per EPFO rules)
    // Wage ceiling: ₹15,000 basic = max PF ₹1,800
    const pfApplicable = salaryData.pf_deduction > 0; // Check if PF is enabled for this employee
    const pfDeduction = pfApplicable ? Math.min(Math.round(actualBasic * 0.12), 1800) : 0;

    // ESI Calculation: 0.75% of Earned Gross (applicable if monthly gross ≤ ₹21,000)
    const esiApplicable = salaryData.esi_deduction > 0 && fixedGross <= 21000;
    const esiDeduction = esiApplicable ? Math.round(actualGross * 0.0075) : 0;

    // Fixed Deductions (constant - not attendance based)
    const professionalTax = parseFloat(salaryData.professional_tax || 0);
    const mediclaimDeduction = parseFloat(salaryData.mediclaim_deduction || 0);
    const advanceDeduction = parseFloat(advance_deduction || 0);
    const otherDeductions = parseFloat(salaryData.other_deductions || 0);

    const totalDeductions = pfDeduction + esiDeduction + professionalTax + mediclaimDeduction + advanceDeduction + otherDeductions;

    // Net Salary = Earned Gross - Deductions
    // Since bonus is already included in gross, net salary includes bonus
    const netSalary = Math.round(actualGross - totalDeductions);
    const netPayableWithBonus = netSalary; // Same as net salary since bonus is in gross

    // Calculate fixed values for reference (full month without absence)
    const fixedPF = pfApplicable ? Math.min(Math.round(fixedBasic * 0.12), 1800) : 0;
    const fixedESI = (salaryData.esi_deduction > 0 && fixedGross <= 21000) ? Math.round(fixedGross * 0.0075) : 0;
    const fixedTotalDeductions = fixedPF + fixedESI + professionalTax + mediclaimDeduction + otherDeductions;
    const fixedNetSalary = fixedGross - fixedTotalDeductions;

    // Insert payslip with both fixed and prorated values
    const query = `
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
      actualAllowance + actualIncentive, // Combined allowances (actual prorated)
      bonus,         // Bonus (8.33% of min(basic, 7000))
      gratuity,      // Gratuity (4.81% of basic)
      actualGross,   // Actual (prorated) gross (includes bonus & gratuity)
      fixedBasic,    // Fixed monthly basic
      fixedHra,      // Fixed monthly HRA
      fixedAllowance + fixedIncentive, // Fixed monthly incentive
      fixedGross,    // Fixed monthly gross
      fixedNetSalary, // Fixed monthly net
      pfDeduction,
      esiDeduction,
      professionalTax,
      mediclaimDeduction,
      advanceDeduction,
      otherDeductions,
      totalDeductions,
      netSalary,
      netPayableWithBonus,  // Net salary (includes bonus & gratuity)
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
    const { month, year, site_id, regenerate, company_id } = req.body;

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
             a.days_present, a.total_days_in_month
      FROM employees e
      INNER JOIN attendance a ON e.employee_id = a.employee_id
      WHERE e.status = 'ACTIVE'
        AND a.attendance_month = ?
        AND a.status = 'FINALIZED'
    `;
    const params = [monthStr];

    // Filter by company_id
    if (company_id) {
      query += ' AND e.company_id = ?';
      params.push(company_id);
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
        const fixedIncentiveRaw = parseFloat(salaryData.incentive_allowance || salaryData.other_allowances || 0);

        // Fixed bonus: 8.33% of min(basic, 7000) if basic <= 21000
        // Bonus is CARVED OUT from Other Allowances (not added on top)
        const fixedBonusEligible = fixedBasic <= 21000;
        const fixedBonusBase = Math.min(fixedBasic, 7000);
        const fixedBonus = fixedBonusEligible ? Math.round(fixedBonusBase * 0.0833) : 0;

        // Fixed gratuity: 4.81% of Basic (Payment of Gratuity Act 1972)
        // Gratuity is CARVED OUT from Other Allowances (not added on top)
        const fixedGratuity = Math.round(fixedBasic * 0.0481);

        // Deduct bonus and gratuity from incentive/other allowances so total stays same as CTC
        const fixedIncentive = Math.max(0, fixedIncentiveRaw - fixedBonus - fixedGratuity);
        const fixedGross = fixedBasic + fixedHra + fixedAllowance + fixedIncentive + fixedBonus + fixedGratuity;

        // Calculate actual (prorated) components
        const actualBasic = Math.round((fixedBasic / daysInMonth) * actualDaysPresent);
        const actualHra = Math.round((fixedHra / daysInMonth) * actualDaysPresent);
        const actualAllowance = Math.round((fixedAllowance / daysInMonth) * actualDaysPresent);

        // Bonus: Payment of Bonus Act 1965 - 8.33% of min(earned basic, 7000)
        // Bonus is CARVED OUT from Other Allowances (part of CTC, not extra)
        const bonusEligible = fixedBasic <= 21000;
        const bonusBase = Math.min(actualBasic, 7000);
        const bonus = bonusEligible ? Math.round(bonusBase * 0.0833) : 0;

        // Gratuity: 4.81% of Earned Basic (Payment of Gratuity Act 1972)
        // Gratuity is CARVED OUT from Other Allowances (part of CTC, not extra)
        const gratuity = Math.round(actualBasic * 0.0481);

        // Deduct bonus and gratuity from incentive so total gross stays same as prorated CTC
        const actualIncentiveRaw = Math.round((fixedIncentiveRaw / daysInMonth) * actualDaysPresent);
        const actualIncentive = Math.max(0, actualIncentiveRaw - bonus - gratuity);

        // Gross = Basic + HRA + Allowance + Incentive + Bonus + Gratuity = Prorated CTC (unchanged)
        const actualGross = actualBasic + actualHra + actualAllowance + actualIncentive + bonus + gratuity;

        // PF Calculation: 12% of Earned Basic (as per EPFO rules)
        // Wage ceiling: ₹15,000 basic = max PF ₹1,800
        const pfApplicable = salaryData.pf_deduction > 0; // Check if PF is enabled for this employee
        const pfDeduction = pfApplicable ? Math.min(Math.round(actualBasic * 0.12), 1800) : 0;

        // ESI Calculation: 0.75% of Earned Gross (applicable if monthly gross ≤ ₹21,000)
        const esiApplicable = salaryData.esi_deduction > 0 && fixedGross <= 21000;
        const esiDeduction = esiApplicable ? Math.round(actualGross * 0.0075) : 0;

        // Fixed Deductions (constant - not attendance based)
        const professionalTax = parseFloat(salaryData.professional_tax || 0);
        const mediclaimDeduction = parseFloat(salaryData.mediclaim_deduction || 0);
        const advanceDeduction = parseFloat(salaryData.advance_deduction || 0);
        const otherDeductions = parseFloat(salaryData.other_deductions || 0);

        const totalDeductions = pfDeduction + esiDeduction + professionalTax + mediclaimDeduction + advanceDeduction + otherDeductions;

        // Net Salary = Earned Gross - Deductions
        // Since bonus is already included in gross, net salary includes bonus
        const netSalary = Math.round(actualGross - totalDeductions);
        const netPayableWithBonus = netSalary; // Same as net salary since bonus is in gross

        // Calculate fixed values for reference (full month without absence)
        const fixedPF = pfApplicable ? Math.min(Math.round(fixedBasic * 0.12), 1800) : 0;
        const fixedESI = (salaryData.esi_deduction > 0 && fixedGross <= 21000) ? Math.round(fixedGross * 0.0075) : 0;
        const fixedTotalDeductions = fixedPF + fixedESI + professionalTax + mediclaimDeduction + otherDeductions;
        const fixedNetSalary = fixedGross - fixedTotalDeductions;

        await executeQuery(
          `INSERT INTO payslips (
            employee_id, salary_id, month,
            total_working_days, total_days_in_month, days_present, days_absent,
            basic_salary, hra, other_allowances, bonus, gratuity, gross_salary,
            fixed_basic, fixed_hra, fixed_incentive, fixed_gross, fixed_net,
            pf_deduction, esi_deduction, professional_tax, mediclaim_deduction,
            advance_deduction, other_deductions, total_deductions,
            net_salary, net_payable_with_bonus, payment_status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            emp.employee_id, salaryData.salary_id, monthStr,
            totalWorkingDays, daysInMonth, actualDaysPresent, daysAbsent,
            actualBasic, actualHra, actualAllowance + actualIncentive, bonus, gratuity, actualGross,
            fixedBasic, fixedHra, fixedAllowance + fixedIncentive, fixedGross, fixedNetSalary,
            pfDeduction, esiDeduction, professionalTax, mediclaimDeduction,
            advanceDeduction, otherDeductions, totalDeductions,
            netSalary, netPayableWithBonus, 'PENDING'
          ]
        );

        results.success++;
        results.details.push(`${emp.employee_code} (${emp.first_name}): ₹${netSalary}`);
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
    const { month, year, site_id, company_id } = req.query;

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

    // Filter by company_id
    if (company_id) {
      query += ' AND e.company_id = ?';
      params.push(company_id);
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
    const { company_id } = req.query;

    let query = `
      SELECT p.*, e.employee_code, e.first_name, e.last_name, e.designation,
             st.site_name, st.site_code
      FROM payslips p
      JOIN employees e ON p.employee_id = e.employee_id
      LEFT JOIN sites st ON e.site_id = st.site_id
      WHERE p.month = ?
    `;
    const params = [month];

    // Filter by company_id
    if (company_id) {
      query += ' AND e.company_id = ?';
      params.push(company_id);
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
