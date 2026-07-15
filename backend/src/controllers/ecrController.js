const { executeQuery } = require('../config/database');

// ==============================================
// ECR CALCULATION CONSTANTS
// ==============================================
const EPF_WAGES_CAP = 15000; // EPF wages capped at ₹15,000
const EPF_EMPLOYEE_RATE = 0.12; // 12% employee contribution
const EPS_RATE = 0.0833; // 8.33% employer pension contribution
const EPF_EMPLOYER_DIFF_RATE = 0.0367; // 3.67% employer EPF (after EPS)

// ==============================================
// VALIDATE UAN FORMAT (12 digits)
// ==============================================
const isValidUAN = (uan) => {
  if (!uan) return false;
  const uanStr = String(uan).trim();
  return /^\d{12}$/.test(uanStr);
};

// ==============================================
// GENERATE ECR TEXT FILE
// ==============================================
const generateECR = async (req, res) => {
  try {
    const { month } = req.params; // Format: YYYY-MM
    const { company_id } = req.query;

    // Validate month format
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid month format. Use YYYY-MM format.'
      });
    }

    // Build query to get payslips with employee UAN details
    let query = `
      SELECT
        p.payslip_id, p.month, p.basic_salary, p.gross_salary,
        p.pf_deduction, p.days_absent,
        e.employee_id, e.employee_code, e.first_name, e.last_name,
        e.uan_no, e.company_id,
        c.company_code, c.company_name
      FROM payslips p
      JOIN employees e ON p.employee_id = e.employee_id
      LEFT JOIN companies c ON e.company_id = c.company_id
      WHERE p.month = ?
        AND p.pf_deduction > 0
    `;
    const params = [month];

    // Filter by company_id
    if (company_id) {
      query += ' AND e.company_id = ?';
      params.push(company_id);
    }

    query += ' ORDER BY e.employee_code';

    const payslips = await executeQuery(query, params);

    if (payslips.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No payslips with PF deduction found for ${month}`
      });
    }

    // Build ECR text content
    const ecrLines = [];
    const warnings = [];
    let totalEPFContribution = 0;
    let totalEPSContribution = 0;
    let totalEPFERDiff = 0;
    let validEmployeeCount = 0;

    for (const payslip of payslips) {
      // Skip employees without valid UAN
      if (!isValidUAN(payslip.uan_no)) {
        warnings.push({
          employee_code: payslip.employee_code,
          name: `${payslip.first_name} ${payslip.last_name}`,
          reason: 'Missing or invalid UAN'
        });
        continue;
      }

      // Calculate EPF wages (capped at 15000)
      const epfWages = Math.min(parseFloat(payslip.basic_salary) || 0, EPF_WAGES_CAP);
      const epsWages = epfWages; // Same as EPF wages
      const edliWages = epfWages; // Same as EPF wages

      // Calculate contributions
      const epfEE = payslip.pf_deduction || Math.round(epfWages * EPF_EMPLOYEE_RATE);
      const eps = Math.round(epsWages * EPS_RATE);
      const epfERDiff = Math.round(epfWages * EPF_EMPLOYER_DIFF_RATE);
      const ncpDays = payslip.days_absent || 0;
      const refund = 0;

      // Build ECR row (pipe-delimited)
      // Format: UAN|MEMBER NAME|GROSS WAGES|EPF WAGES|EPS WAGES|EDLI WAGES|EPF (EE)|EPS|EPF (ER Diff)|NCP DAYS|REFUND
      const ecrRow = [
        String(payslip.uan_no).trim(),
        `${payslip.first_name} ${payslip.last_name}`.toUpperCase().trim(),
        Math.round(parseFloat(payslip.gross_salary) || 0),
        Math.round(epfWages),
        Math.round(epsWages),
        Math.round(edliWages),
        Math.round(epfEE),
        Math.round(eps),
        Math.round(epfERDiff),
        Math.round(ncpDays),
        Math.round(refund)
      ].join('|');

      ecrLines.push(ecrRow);
      totalEPFContribution += epfEE;
      totalEPSContribution += eps;
      totalEPFERDiff += epfERDiff;
      validEmployeeCount++;
    }

    if (ecrLines.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No employees with valid UAN found for ECR generation',
        warnings
      });
    }

    // Create ECR text content
    const ecrContent = ecrLines.join('\n');

    // Get company code for filename
    const companyCode = payslips[0]?.company_code || 'COMPANY';

    // Set response headers for file download
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="ECR_${month}_${companyCode}.txt"`);

    // Send the ECR content
    res.send(ecrContent);

  } catch (error) {
    console.error('Generate ECR error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate ECR file',
      error: error.message
    });
  }
};

// ==============================================
// PREVIEW ECR DATA (JSON)
// ==============================================
const previewECR = async (req, res) => {
  try {
    const { month } = req.params; // Format: YYYY-MM
    const { company_id } = req.query;

    // Validate month format
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid month format. Use YYYY-MM format.'
      });
    }

    // Build query to get payslips with employee UAN details
    let query = `
      SELECT
        p.payslip_id, p.month, p.basic_salary, p.gross_salary,
        p.pf_deduction, p.days_absent,
        e.employee_id, e.employee_code, e.first_name, e.last_name,
        e.uan_no, e.company_id,
        c.company_code, c.company_name
      FROM payslips p
      JOIN employees e ON p.employee_id = e.employee_id
      LEFT JOIN companies c ON e.company_id = c.company_id
      WHERE p.month = ?
        AND p.pf_deduction > 0
    `;
    const params = [month];

    // Filter by company_id
    if (company_id) {
      query += ' AND e.company_id = ?';
      params.push(company_id);
    }

    query += ' ORDER BY e.employee_code';

    const payslips = await executeQuery(query, params);

    if (payslips.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No payslips with PF deduction found for ${month}`
      });
    }

    // Build ECR preview data
    const ecrData = [];
    const warnings = [];
    let totalGrossWages = 0;
    let totalEPFWages = 0;
    let totalEPFContribution = 0;
    let totalEPSContribution = 0;
    let totalEPFERDiff = 0;
    let validEmployeeCount = 0;
    let invalidEmployeeCount = 0;

    for (const payslip of payslips) {
      const hasValidUAN = isValidUAN(payslip.uan_no);

      // Calculate EPF wages (capped at 15000)
      const epfWages = Math.min(parseFloat(payslip.basic_salary) || 0, EPF_WAGES_CAP);
      const epsWages = epfWages;
      const edliWages = epfWages;

      // Calculate contributions
      const epfEE = payslip.pf_deduction || Math.round(epfWages * EPF_EMPLOYEE_RATE);
      const eps = Math.round(epsWages * EPS_RATE);
      const epfERDiff = Math.round(epfWages * EPF_EMPLOYER_DIFF_RATE);
      const ncpDays = payslip.days_absent || 0;

      const record = {
        employee_code: payslip.employee_code,
        name: `${payslip.first_name} ${payslip.last_name}`.toUpperCase(),
        uan: payslip.uan_no || null,
        uan_valid: hasValidUAN,
        gross_wages: Math.round(parseFloat(payslip.gross_salary) || 0),
        epf_wages: Math.round(epfWages),
        eps_wages: Math.round(epsWages),
        edli_wages: Math.round(edliWages),
        epf_contribution: Math.round(epfEE),
        eps_contribution: Math.round(eps),
        epf_er_diff: Math.round(epfERDiff),
        ncp_days: Math.round(ncpDays),
        refund: 0
      };

      ecrData.push(record);

      if (hasValidUAN) {
        validEmployeeCount++;
        totalGrossWages += record.gross_wages;
        totalEPFWages += record.epf_wages;
        totalEPFContribution += record.epf_contribution;
        totalEPSContribution += record.eps_contribution;
        totalEPFERDiff += record.epf_er_diff;
      } else {
        invalidEmployeeCount++;
        warnings.push({
          employee_code: payslip.employee_code,
          name: `${payslip.first_name} ${payslip.last_name}`,
          uan: payslip.uan_no || 'Not provided',
          reason: 'Missing or invalid UAN (must be 12 digits)'
        });
      }
    }

    // Get company info
    const companyCode = payslips[0]?.company_code || 'COMPANY';
    const companyName = payslips[0]?.company_name || 'Unknown';

    res.status(200).json({
      success: true,
      data: {
        month,
        company_code: companyCode,
        company_name: companyName,
        summary: {
          total_employees: payslips.length,
          valid_employees: validEmployeeCount,
          invalid_employees: invalidEmployeeCount,
          total_gross_wages: totalGrossWages,
          total_epf_wages: totalEPFWages,
          total_epf_contribution: totalEPFContribution,
          total_eps_contribution: totalEPSContribution,
          total_epf_er_diff: totalEPFERDiff,
          total_employer_contribution: totalEPSContribution + totalEPFERDiff
        },
        employees: ecrData,
        warnings
      }
    });

  } catch (error) {
    console.error('Preview ECR error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to preview ECR data',
      error: error.message
    });
  }
};

module.exports = {
  generateECR,
  previewECR
};
