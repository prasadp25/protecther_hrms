const { executeQuery } = require('../config/database');
const { asyncHandler } = require('../utils/errors');
const { buildCompanyFilter, getCompanyFilter } = require('../middleware/auth');

// ==============================================
// Statutory / Compliance registers.
// All figures come straight from the payslips table (already computed at payslip
// generation) — this is a reporting/export layer, not new payroll math.
// Company scoping via buildCompanyFilter (user's own company for ADMIN/HR,
// optional ?company_id for SUPER_ADMIN).
// ==============================================

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const nameExpr = `TRIM(CONCAT(e.first_name, ' ', COALESCE(e.last_name, '')))`;

// Statutory rates from the single source of truth. (ESI employee 0.75% comes
// straight from the payslip; only the employer share is applied here.)
const {
  EPF_WAGES_CAP,
  EPS_RATE,
  EPF_EMPLOYER_DIFF_RATE: EPF_EMPLOYER_DIFF,
  ESI_EMPLOYER_RATE,
} = require('../config/statutory');

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

// ---- Form C : Bonus Register (Payment of Bonus Rules 1975, Rule 4(c)) ----
// Aggregates bonus over an accounting year (Apr <fy> -> Mar <fy+1>) with the
// fields the statutory Form C needs. Deduction/payment/signature columns are
// left for the employer to fill and are added by the frontend export.
const getBonusFormC = asyncHandler(async (req, res) => {
  const fy = parseInt(req.query.fy, 10);
  if (!fy || fy < 2000 || fy > 2100) {
    return res.status(400).json({ success: false, message: 'Invalid fy. Use the accounting-year start, e.g. fy=2026 for Apr 2026 - Mar 2027.' });
  }
  const from = `${fy}-04`;
  const to = `${fy + 1}-03`;
  const cf = buildCompanyFilter('e', req);
  const query = `
    SELECT e.employee_code, ${nameExpr} AS employee_name, e.designation, e.dob,
           SUM(p.days_present) AS days_worked,
           ROUND(SUM(p.basic_salary)) AS total_wages,
           ROUND(SUM(p.bonus)) AS total_bonus,
           MAX(c.company_name) AS company_name
    FROM payslips p
    JOIN employees e ON e.employee_id = p.employee_id
    LEFT JOIN companies c ON c.company_id = e.company_id
    WHERE p.month >= ? AND p.month <= ? AND p.bonus > 0 ${cf.clause}
    GROUP BY e.employee_id
    HAVING total_bonus > 0
    ORDER BY e.employee_code`;
  const rows = await executeQuery(query, [from, to, ...cf.params]);
  const startOfYear = new Date(`${fy}-04-01`).getTime();
  const data = rows.map((r) => {
    const dob = r.dob ? new Date(r.dob).getTime() : null;
    const age = dob != null ? (startOfYear - dob) / (365.25 * 24 * 3600 * 1000) : null;
    return { ...r, completed_15: age == null ? '' : (age >= 15 ? 'Yes' : 'No') };
  });
  const total = data.reduce((s, r) => s + Number(r.total_bonus || 0), 0);
  res.json({
    success: true,
    data,
    summary: { fy_label: `${fy}-${String(fy + 1).slice(-2)}`, from, to, employees: data.length, total_bonus: total, company: data[0]?.company_name || '' },
  });
});

// ---- Gratuity Liability (Payment of Gratuity Act) ----
// Cumulative accrued provision + estimated payable-on-exit. NOT a monthly payout.
const getGratuityLiability = asyncHandler(async (req, res) => {
  const cf = buildCompanyFilter('e', req);
  // MAX() on the joined columns (each is single-valued per employee) so the
  // GROUP BY e.employee_id satisfies ONLY_FULL_GROUP_BY.
  const query = `
    SELECT e.employee_code, ${nameExpr} AS employee_name, e.designation,
           e.date_of_joining, e.status, MAX(c.company_name) AS company_name, MAX(st.site_name) AS site_name,
           MAX(s.basic_salary) AS current_basic,
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

// ---- EPS-exempt management (for the recurring EPFO RFE-21 error) ----
// List employees currently flagged as NOT in the pension scheme.
const getEpsExempt = asyncHandler(async (req, res) => {
  const cf = buildCompanyFilter('e', req);
  const rows = await executeQuery(
    `SELECT e.employee_code, TRIM(CONCAT(e.first_name,' ',COALESCE(e.last_name,''))) AS name,
            e.uan_no, e.status
     FROM employees e WHERE e.eps_applicable = 0 ${cf.clause}
     ORDER BY e.employee_code`,
    cf.params
  );
  res.json({ success: true, data: rows, summary: { count: rows.length } });
});

// Bulk set/clear the EPS-exempt flag by pasting UANs and/or employee codes.
// Body: { identifiers: string[] | string, exempt: boolean }
const setEpsExempt = asyncHandler(async (req, res) => {
  let { identifiers, exempt = true } = req.body;
  if (typeof identifiers === 'string') identifiers = identifiers.split(/[\s,;]+/);
  if (!Array.isArray(identifiers)) identifiers = [];
  const tokens = [...new Set(identifiers.map((x) => String(x).trim()).filter(Boolean))];
  if (tokens.length === 0) {
    return res.status(400).json({ success: false, message: 'Provide at least one UAN or employee code.' });
  }

  const ph = tokens.map(() => '?').join(',');
  const params = [...tokens, ...tokens];
  let findQ = `SELECT employee_id, employee_code, uan_no,
                      TRIM(CONCAT(first_name,' ',COALESCE(last_name,''))) AS name
               FROM employees WHERE (uan_no IN (${ph}) OR employee_code IN (${ph}))`;
  const companyId = getCompanyFilter(req);
  if (companyId) { findQ += ' AND company_id = ?'; params.push(companyId); }
  const matched = await executeQuery(findQ, params);

  const seen = new Set();
  matched.forEach((m) => { if (m.uan_no) seen.add(String(m.uan_no)); seen.add(String(m.employee_code)); });
  const unmatched = tokens.filter((t) => !seen.has(t));

  if (matched.length) {
    const ids = matched.map((m) => m.employee_id);
    await executeQuery(
      `UPDATE employees SET eps_applicable = ? WHERE employee_id IN (${ids.map(() => '?').join(',')})`,
      [exempt ? 0 : 1, ...ids]
    );
  }

  res.json({
    success: true,
    exempt: !!exempt,
    updated: matched.length,
    employees: matched.map((m) => ({ employee_code: m.employee_code, name: m.name, uan_no: m.uan_no })),
    unmatched,
  });
});

module.exports = { getBonusRegister, getBonusFormC, getGratuityLiability, getPFRegister, getESIRegister, getPTRegister, getEpsExempt, setEpsExempt };
