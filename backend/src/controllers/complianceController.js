const { executeQuery } = require('../config/database');
const { asyncHandler } = require('../utils/errors');
const { buildCompanyFilter } = require('../middleware/auth');

// ==============================================
// Statutory / Compliance registers.
// All figures come straight from the payslips table (already computed at payslip
// generation) — this is a reporting/export layer, not new payroll math.
// Company scoping via buildCompanyFilter (user's own company for ADMIN/HR,
// optional ?company_id for SUPER_ADMIN).
// ==============================================

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const nameExpr = `TRIM(CONCAT(e.first_name, ' ', COALESCE(e.last_name, '')))`;

// EPF constants (mirror ecrController.js)
const EPF_WAGES_CAP = 15000;
const EPS_RATE = 0.0833;      // employer pension
const EPF_EMPLOYER_DIFF = 0.0367; // employer EPF after EPS
// ESI statutory rates
const ESI_EMPLOYEE_RATE = 0.0075;
const ESI_EMPLOYER_RATE = 0.0325;

const requireMonth = (month, res) => {
  if (!month || !MONTH_RE.test(month)) {
    res.status(400).json({ success: false, message: 'Invalid month. Use YYYY-MM format.' });
    return false;
  }
  return true;
};

// ---- Bonus Register (Payment of Bonus Act) ----
// ?month=YYYY-MM for a single month, or ?year=YYYY for the annual register.
const getBonusRegister = asyncHandler(async (req, res) => {
  const { month, year } = req.query;
  const cf = buildCompanyFilter('e', req);

  if (year) {
    if (!/^\d{4}$/.test(year)) {
      return res.status(400).json({ success: false, message: 'Invalid year. Use YYYY.' });
    }
    const query = `
      SELECT e.employee_code, ${nameExpr} AS employee_name, e.designation,
             c.company_name, st.site_name,
             COUNT(*) AS months_paid, SUM(p.bonus) AS total_bonus
      FROM payslips p
      JOIN employees e ON e.employee_id = p.employee_id
      LEFT JOIN companies c ON c.company_id = e.company_id
      LEFT JOIN sites st ON st.site_id = e.site_id
      WHERE p.month LIKE ? AND p.bonus > 0 ${cf.clause}
      GROUP BY e.employee_id ORDER BY e.employee_code`;
    const data = await executeQuery(query, [`${year}-%`, ...cf.params]);
    const total = data.reduce((s, r) => s + Number(r.total_bonus || 0), 0);
    return res.json({ success: true, data, summary: { scope: 'annual', year, employees: data.length, total_bonus: total } });
  }

  if (!requireMonth(month, res)) return;
  const query = `
    SELECT e.employee_code, ${nameExpr} AS employee_name, e.designation,
           c.company_name, st.site_name,
           p.basic_salary, p.days_present, p.total_days_in_month, p.bonus
    FROM payslips p
    JOIN employees e ON e.employee_id = p.employee_id
    LEFT JOIN companies c ON c.company_id = e.company_id
    LEFT JOIN sites st ON st.site_id = e.site_id
    WHERE p.month = ? AND p.bonus > 0 ${cf.clause}
    ORDER BY e.employee_code`;
  const data = await executeQuery(query, [month, ...cf.params]);
  const total = data.reduce((s, r) => s + Number(r.bonus || 0), 0);
  res.json({ success: true, data, summary: { scope: 'month', month, employees: data.length, total_bonus: total } });
});

// ---- Gratuity Liability (Payment of Gratuity Act) ----
// Cumulative accrued provision + estimated payable-on-exit. NOT a monthly payout.
const getGratuityLiability = asyncHandler(async (req, res) => {
  const cf = buildCompanyFilter('e', req);
  const query = `
    SELECT e.employee_code, ${nameExpr} AS employee_name, e.designation,
           e.date_of_joining, e.status, c.company_name, st.site_name,
           s.basic_salary AS current_basic,
           SUM(p.gratuity) AS accrued_gratuity, COUNT(p.payslip_id) AS months_accrued
    FROM employees e
    LEFT JOIN payslips p ON p.employee_id = e.employee_id
    LEFT JOIN salaries s ON s.employee_id = e.employee_id AND s.status = 'ACTIVE'
    LEFT JOIN companies c ON c.company_id = e.company_id
    LEFT JOIN sites st ON st.site_id = e.site_id
    WHERE 1=1 ${cf.clause}
    GROUP BY e.employee_id
    HAVING accrued_gratuity > 0 OR e.status = 'ACTIVE'
    ORDER BY e.employee_code`;
  const rows = await executeQuery(query, cf.params);
  const now = Date.now();
  const data = rows.map((r) => {
    const doj = r.date_of_joining ? new Date(r.date_of_joining) : null;
    const years = doj ? (now - doj.getTime()) / (365.25 * 24 * 3600 * 1000) : 0;
    const basic = Number(r.current_basic || 0);
    // Statutory formula: (last basic × 15 / 26) per completed year of service
    const payableOnExit = Math.round((basic * 15 / 26) * Math.floor(years));
    return {
      ...r,
      accrued_gratuity: Math.round(Number(r.accrued_gratuity || 0)),
      years_of_service: Number(years.toFixed(1)),
      eligible_5yr: years >= 5,
      est_payable_on_exit: payableOnExit,
    };
  });
  const totalAccrued = data.reduce((s, r) => s + r.accrued_gratuity, 0);
  res.json({ success: true, data, summary: { employees: data.length, total_accrued: totalAccrued, note: 'Accrued provision — payable on exit (5+ years) per Gratuity Act, not a monthly payout.' } });
});

// ---- PF Register ----
const getPFRegister = asyncHandler(async (req, res) => {
  const { month } = req.query;
  if (!requireMonth(month, res)) return;
  const cf = buildCompanyFilter('e', req);
  const query = `
    SELECT e.employee_code, ${nameExpr} AS employee_name, e.uan_no, e.pf_no,
           c.company_name, p.basic_salary, p.pf_deduction
    FROM payslips p
    JOIN employees e ON e.employee_id = p.employee_id
    LEFT JOIN companies c ON c.company_id = e.company_id
    WHERE p.month = ? AND p.pf_deduction > 0 ${cf.clause}
    ORDER BY e.employee_code`;
  const rows = await executeQuery(query, [month, ...cf.params]);
  const data = rows.map((r) => {
    const epfWages = Math.min(Number(r.basic_salary || 0), EPF_WAGES_CAP);
    const employee = Math.round(Number(r.pf_deduction || 0)); // 12%
    const eps = Math.round(epfWages * EPS_RATE);
    const employerEpf = Math.round(epfWages * EPF_EMPLOYER_DIFF);
    return { ...r, epf_wages: epfWages, employee_pf: employee, employer_eps: eps, employer_epf: employerEpf, total_pf: employee + eps + employerEpf };
  });
  const sum = (k) => data.reduce((s, r) => s + Number(r[k] || 0), 0);
  res.json({ success: true, data, summary: { month, employees: data.length, employee_pf: sum('employee_pf'), employer_eps: sum('employer_eps'), employer_epf: sum('employer_epf'), total_pf: sum('total_pf') } });
});

// ---- ESI Register ----
const getESIRegister = asyncHandler(async (req, res) => {
  const { month } = req.query;
  if (!requireMonth(month, res)) return;
  const cf = buildCompanyFilter('e', req);
  const query = `
    SELECT e.employee_code, ${nameExpr} AS employee_name, e.esi_no,
           c.company_name, p.gross_salary, p.esi_deduction
    FROM payslips p
    JOIN employees e ON e.employee_id = p.employee_id
    LEFT JOIN companies c ON c.company_id = e.company_id
    WHERE p.month = ? ${cf.clause}
    ORDER BY e.employee_code`;
  const rows = await executeQuery(query, [month, ...cf.params]);
  const data = rows.map((r) => {
    const employee = Math.round(Number(r.esi_deduction || 0)); // 0.75%
    const employer = employee > 0 ? Math.round(Number(r.gross_salary || 0) * ESI_EMPLOYER_RATE) : 0;
    return { ...r, employee_esi: employee, employer_esi: employer, total_esi: employee + employer };
  });
  const sum = (k) => data.reduce((s, r) => s + Number(r[k] || 0), 0);
  res.json({ success: true, data, summary: { month, employees: data.length, employee_esi: sum('employee_esi'), employer_esi: sum('employer_esi'), total_esi: sum('total_esi'), note: 'ESI applies only when enabled (gross < 21,000). Currently ₹0 unless switched on.' } });
});

// ---- Professional Tax Register ----
const getPTRegister = asyncHandler(async (req, res) => {
  const { month } = req.query;
  if (!requireMonth(month, res)) return;
  const cf = buildCompanyFilter('e', req);
  const query = `
    SELECT e.employee_code, ${nameExpr} AS employee_name, e.state,
           c.company_name, p.gross_salary, p.professional_tax
    FROM payslips p
    JOIN employees e ON e.employee_id = p.employee_id
    LEFT JOIN companies c ON c.company_id = e.company_id
    WHERE p.month = ? AND p.professional_tax > 0 ${cf.clause}
    ORDER BY c.company_name, e.employee_code`;
  const data = await executeQuery(query, [month, ...cf.params]);
  const total = data.reduce((s, r) => s + Number(r.professional_tax || 0), 0);
  res.json({ success: true, data, summary: { month, employees: data.length, total_pt: total } });
});

module.exports = { getBonusRegister, getGratuityLiability, getPFRegister, getESIRegister, getPTRegister };
