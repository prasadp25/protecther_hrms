const { executeQuery } = require('../config/database');
// Statutory rates come from the single source of truth. Employer EPF share is
// derived as EPF(12%) − EPS(8.33%), not a flat 3.67%, so it reconciles exactly
// with EPFO's ECR validation (RFE-37).
const {
  EPF_WAGES_CAP,
  PF_EMPLOYEE_RATE: EPF_EMPLOYEE_RATE,
  EPS_RATE,
} = require('../config/statutory');

// ==============================================
// VALIDATE UAN FORMAT (12 digits)
// ==============================================
const { UAN: UAN_PATTERN } = require('../utils/validationPatterns');
const isValidUAN = (uan) => {
  if (!uan) return false;
  return UAN_PATTERN.test(String(uan).trim());
};

// Shared payslip+employee query for both the ECR file and its preview.
const ECR_SELECT = `
  SELECT
    p.payslip_id, p.month, p.basic_salary, p.gross_salary,
    p.pf_deduction, p.days_absent,
    e.employee_id, e.employee_code, e.first_name, e.last_name,
    e.uan_no, e.eps_applicable, e.company_id,
    c.company_code, c.company_name
  FROM payslips p
  JOIN employees e ON p.employee_id = e.employee_id
  LEFT JOIN companies c ON e.company_id = c.company_id
  WHERE p.month = ?
    AND p.pf_deduction > 0
`;

const fetchEcrPayslips = async (month, companyId) => {
  let query = ECR_SELECT;
  const params = [month];
  if (companyId) { query += ' AND e.company_id = ?'; params.push(companyId); }
  query += ' ORDER BY e.employee_code';
  return executeQuery(query, params);
};

// EPFO contribution fields for one payslip (shared by generate + preview).
// EPS wages are 0 for members not in the pension scheme (EPFO-flagged). Employer
// EPF (ER diff) MUST equal Employee EPF (12%) − EPS (8.33%) exactly, so it is
// derived from the two rather than a flat 3.67% (which rounds off by ±1 → RFE-37).
const computeEcrFields = (p) => {
  const epfWages = Math.min(parseFloat(p.basic_salary) || 0, EPF_WAGES_CAP);
  const epsWages = p.eps_applicable !== 0 ? epfWages : 0;
  const epfEE = p.pf_deduction || Math.round(epfWages * EPF_EMPLOYEE_RATE);
  const eps = Math.round(epsWages * EPS_RATE);
  return {
    epfWages,
    edliWages: epfWages,
    epsWages,
    epfEE,
    eps,
    epfERDiff: epfEE - eps,
    ncpDays: p.days_absent || 0,
    grossWages: parseFloat(p.gross_salary) || 0,
  };
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

    const payslips = await fetchEcrPayslips(month, company_id);

    if (payslips.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No payslips with PF deduction found for ${month}`
      });
    }

    // Build ECR text content
    const ecrLines = [];
    const warnings = [];

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

      const f = computeEcrFields(payslip);

      // EPFO's ECR text format uses "#~#" as the field delimiter.
      // Format: UAN#~#MEMBER NAME#~#GROSS WAGES#~#EPF WAGES#~#EPS WAGES#~#EDLI WAGES#~#EPF(EE)#~#EPS#~#EPF(ER Diff)#~#NCP DAYS#~#REFUND
      const ecrRow = [
        String(payslip.uan_no).trim(),
        `${payslip.first_name} ${payslip.last_name}`.toUpperCase().trim(),
        Math.round(f.grossWages),
        Math.round(f.epfWages),
        Math.round(f.epsWages),
        Math.round(f.edliWages),
        Math.round(f.epfEE),
        Math.round(f.eps),
        Math.round(f.epfERDiff),
        Math.round(f.ncpDays),
        0
      ].join('#~#');

      ecrLines.push(ecrRow);
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

    const payslips = await fetchEcrPayslips(month, company_id);

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
      const f = computeEcrFields(payslip);

      const record = {
        employee_code: payslip.employee_code,
        name: `${payslip.first_name} ${payslip.last_name}`.toUpperCase(),
        uan: payslip.uan_no || null,
        uan_valid: hasValidUAN,
        gross_wages: Math.round(f.grossWages),
        epf_wages: Math.round(f.epfWages),
        eps_wages: Math.round(f.epsWages),
        edli_wages: Math.round(f.edliWages),
        epf_contribution: Math.round(f.epfEE),
        eps_contribution: Math.round(f.eps),
        epf_er_diff: Math.round(f.epfERDiff),
        ncp_days: Math.round(f.ncpDays),
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
