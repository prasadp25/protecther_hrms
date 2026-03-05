const { executeQuery } = require('../config/database');
const { asyncHandler } = require('../utils/errors');

// ===================================
// EMPLOYEE REPORTS
// ===================================

/**
 * Get Employee Attendance Report
 * Shows attendance summary for employees in a date range
 */
const getEmployeeAttendanceReport = asyncHandler(async (req, res) => {
  const { month, year, site_id, employee_id, company_id } = req.query;

  let whereConditions = [];
  let params = [];

  if (month && year) {
    const attendanceMonth = `${year}-${String(month).padStart(2, '0')}`;
    whereConditions.push('a.attendance_month = ?');
    params.push(attendanceMonth);
  }

  if (site_id) {
    whereConditions.push('e.site_id = ?');
    params.push(site_id);
  }

  if (employee_id) {
    whereConditions.push('e.employee_id = ?');
    params.push(employee_id);
  }

  if (company_id) {
    whereConditions.push('e.company_id = ?');
    params.push(company_id);
  }

  const whereClause = whereConditions.length > 0
    ? 'WHERE ' + whereConditions.join(' AND ')
    : '';

  const query = `
    SELECT
      e.employee_id,
      e.employee_code,
      e.first_name,
      e.last_name,
      e.designation,
      s.site_name,
      s.site_code,
      a.attendance_month,
      a.days_present as present_days,
      a.total_days_in_month,
      (a.total_days_in_month - a.days_present) as absent_days,
      0 as half_days,
      0 as paid_leaves,
      0 as total_overtime_hours,
      a.status as attendance_status,
      a.remarks
    FROM employees e
    LEFT JOIN attendance a ON e.employee_id = a.employee_id
    LEFT JOIN sites s ON e.site_id = s.site_id
    ${whereClause}
    ORDER BY e.employee_code, a.attendance_month DESC
  `;

  const report = await executeQuery(query, params);

  res.json({
    success: true,
    data: report,
    summary: {
      totalEmployees: report.length,
      month: month || 'All',
      year: year || 'All',
      generatedAt: new Date().toISOString()
    }
  });
});

/**
 * Get Employee Salary Report
 * Shows actual payroll details for employees based on payslips
 */
const getEmployeeSalaryReport = asyncHandler(async (req, res) => {
  const { site_id, month, year, status, company_id } = req.query;

  let whereConditions = [];
  let params = [];

  // Filter by payslip month (format: 'YYYY-MM')
  if (month && year) {
    const payslipMonth = `${year}-${String(month).padStart(2, '0')}`;
    whereConditions.push('p.month = ?');
    params.push(payslipMonth);
  }

  if (site_id) {
    whereConditions.push('e.site_id = ?');
    params.push(site_id);
  }

  if (status) {
    whereConditions.push('e.status = ?');
    params.push(status);
  }

  if (company_id) {
    whereConditions.push('e.company_id = ?');
    params.push(company_id);
  }

  const whereClause = whereConditions.length > 0
    ? 'WHERE ' + whereConditions.join(' AND ')
    : '';

  const query = `
    SELECT
      e.employee_id,
      e.employee_code,
      e.first_name,
      e.last_name,
      e.designation,
      e.status as employee_status,
      st.site_name,
      st.site_code,
      p.basic_salary,
      p.hra,
      p.other_allowances,
      p.overtime_amount,
      p.gross_salary,
      p.pf_deduction,
      p.esi_deduction,
      p.professional_tax,
      p.tds,
      p.other_deductions,
      p.total_deductions,
      p.net_salary,
      p.payment_status,
      p.month as salary_month
    FROM payslips p
    JOIN employees e ON p.employee_id = e.employee_id
    LEFT JOIN sites st ON e.site_id = st.site_id
    ${whereClause}
    ORDER BY e.employee_code
  `;

  const report = await executeQuery(query, params);

  // Calculate totals
  const totals = report.reduce((acc, row) => ({
    totalGross: acc.totalGross + parseFloat(row.gross_salary || 0),
    totalDeductions: acc.totalDeductions + parseFloat(row.total_deductions || 0),
    totalNet: acc.totalNet + parseFloat(row.net_salary || 0)
  }), { totalGross: 0, totalDeductions: 0, totalNet: 0 });

  res.json({
    success: true,
    data: report,
    summary: {
      totalEmployees: report.length,
      totalGrossSalary: totals.totalGross,
      totalDeductions: totals.totalDeductions,
      totalNetSalary: totals.totalNet,
      averageNetSalary: report.length > 0 ? totals.totalNet / report.length : 0,
      generatedAt: new Date().toISOString()
    }
  });
});

// ===================================
// SITE REPORTS
// ===================================

/**
 * Get Site-wise Employee Distribution Report
 */
const getSiteEmployeeReport = asyncHandler(async (req, res) => {
  const { status, company_id } = req.query;

  let whereConditions = [];
  const params = [];

  if (status) {
    whereConditions.push('e.status = ?');
    params.push(status);
  }

  if (company_id) {
    whereConditions.push('e.company_id = ?');
    params.push(company_id);
  }

  const whereClause = whereConditions.length > 0
    ? 'WHERE ' + whereConditions.join(' AND ')
    : '';

  const query = `
    SELECT
      s.site_id,
      s.site_code,
      s.site_name,
      s.location,
      s.client_name,
      s.status as site_status,
      COUNT(e.employee_id) as total_employees,
      SUM(CASE WHEN e.status = 'ACTIVE' THEN 1 ELSE 0 END) as active_employees,
      SUM(CASE WHEN e.status = 'RESIGNED' THEN 1 ELSE 0 END) as resigned_employees,
      SUM(CASE WHEN e.status = 'TERMINATED' THEN 1 ELSE 0 END) as terminated_employees,
      SUM(CASE WHEN e.status = 'ON_LEAVE' THEN 1 ELSE 0 END) as on_leave_employees
    FROM sites s
    LEFT JOIN employees e ON s.site_id = e.site_id ${whereClause ? 'AND ' + whereConditions.join(' AND ') : ''}
    GROUP BY s.site_id
    ORDER BY total_employees DESC, s.site_name
  `;

  const report = await executeQuery(query, params);

  const totals = report.reduce((acc, row) => ({
    totalSites: acc.totalSites + 1,
    totalEmployees: acc.totalEmployees + row.total_employees,
    totalActive: acc.totalActive + row.active_employees
  }), { totalSites: 0, totalEmployees: 0, totalActive: 0 });

  res.json({
    success: true,
    data: report,
    summary: {
      totalSites: totals.totalSites,
      totalEmployees: totals.totalEmployees,
      totalActiveEmployees: totals.totalActive,
      averageEmployeesPerSite: totals.totalSites > 0 ? totals.totalEmployees / totals.totalSites : 0,
      generatedAt: new Date().toISOString()
    }
  });
});

/**
 * Get Site-wise Salary Cost Report
 * Shows actual payroll costs per site based on payslips for the selected month
 */
const getSiteSalaryCostReport = asyncHandler(async (req, res) => {
  const { month, year, site_id, company_id } = req.query;

  let whereConditions = [];
  let params = [];

  // Build the payslip month filter (format: 'YYYY-MM')
  if (month && year) {
    const payslipMonth = `${year}-${String(month).padStart(2, '0')}`;
    whereConditions.push('p.month = ?');
    params.push(payslipMonth);
  }

  // Filter by specific site if provided
  if (site_id) {
    whereConditions.push('st.site_id = ?');
    params.push(site_id);
  }

  // Filter by company_id if provided
  if (company_id) {
    whereConditions.push('e.company_id = ?');
    params.push(company_id);
  }

  const whereClause = whereConditions.length > 0
    ? 'WHERE ' + whereConditions.join(' AND ')
    : '';

  const query = `
    SELECT
      st.site_id,
      st.site_code,
      st.site_name,
      st.location,
      st.client_name,
      COUNT(DISTINCT p.employee_id) as employee_count,
      COALESCE(SUM(p.basic_salary), 0) as total_basic,
      COALESCE(SUM(p.gross_salary), 0) as total_gross,
      COALESCE(SUM(p.total_deductions), 0) as total_deductions,
      COALESCE(SUM(p.net_salary), 0) as total_net,
      COALESCE(AVG(p.net_salary), 0) as avg_salary_per_employee
    FROM payslips p
    JOIN employees e ON p.employee_id = e.employee_id
    JOIN sites st ON e.site_id = st.site_id
    ${whereClause}
    GROUP BY st.site_id
    ORDER BY total_net DESC
  `;

  const report = await executeQuery(query, params);

  const totals = report.reduce((acc, row) => ({
    totalGross: acc.totalGross + parseFloat(row.total_gross || 0),
    totalNet: acc.totalNet + parseFloat(row.total_net || 0),
    totalEmployees: acc.totalEmployees + row.employee_count
  }), { totalGross: 0, totalNet: 0, totalEmployees: 0 });

  res.json({
    success: true,
    data: report,
    summary: {
      totalSites: report.length,
      totalEmployees: totals.totalEmployees,
      totalGrossSalary: totals.totalGross,
      totalNetSalary: totals.totalNet,
      month: month || 'All',
      year: year || 'All',
      generatedAt: new Date().toISOString()
    }
  });
});

// ===================================
// PAYROLL REPORTS
// ===================================

/**
 * Get Monthly Payroll Summary Report
 * Uses p.month column (format: 'YYYY-MM') for accurate monthly filtering
 */
const getMonthlyPayrollReport = asyncHandler(async (req, res) => {
  const { month, year, company_id } = req.query;

  if (!month || !year) {
    return res.status(400).json({
      success: false,
      message: 'Month and year are required'
    });
  }

  // Build payslip month filter (format: 'YYYY-MM')
  const payslipMonth = `${year}-${String(month).padStart(2, '0')}`;

  let whereConditions = ['p.month = ?'];
  let params = [payslipMonth];

  if (company_id) {
    whereConditions.push('e.company_id = ?');
    params.push(company_id);
  }

  const whereClause = 'WHERE ' + whereConditions.join(' AND ');

  const query = `
    SELECT
      p.month as month_year,
      COUNT(DISTINCT p.payslip_id) as total_payslips,
      COUNT(DISTINCT p.employee_id) as total_employees,
      SUM(p.gross_salary) as total_gross,
      SUM(p.total_deductions) as total_deductions,
      SUM(p.net_salary) as total_net,
      SUM(p.overtime_amount) as total_overtime,
      SUM(CASE WHEN p.payment_status = 'PAID' THEN p.net_salary ELSE 0 END) as total_paid,
      SUM(CASE WHEN p.payment_status = 'PENDING' THEN p.net_salary ELSE 0 END) as total_pending,
      COUNT(CASE WHEN p.payment_status = 'PAID' THEN 1 END) as paid_count,
      COUNT(CASE WHEN p.payment_status = 'PENDING' THEN 1 END) as pending_count
    FROM payslips p
    JOIN employees e ON p.employee_id = e.employee_id
    ${whereClause}
    GROUP BY p.month
  `;

  const report = await executeQuery(query, params);

  // Get site-wise breakdown
  let siteParams = [payslipMonth];
  let siteWhereConditions = ['p.month = ?'];
  if (company_id) {
    siteWhereConditions.push('e.company_id = ?');
    siteParams.push(company_id);
  }

  const siteBreakdownQuery = `
    SELECT
      s.site_name,
      s.site_code,
      COUNT(DISTINCT p.payslip_id) as payslip_count,
      SUM(p.net_salary) as site_total
    FROM payslips p
    JOIN employees e ON p.employee_id = e.employee_id
    LEFT JOIN sites s ON e.site_id = s.site_id
    WHERE ${siteWhereConditions.join(' AND ')}
    GROUP BY s.site_id
    ORDER BY site_total DESC
  `;

  const siteBreakdown = await executeQuery(siteBreakdownQuery, siteParams);

  res.json({
    success: true,
    data: report[0] || {},
    siteBreakdown,
    summary: {
      month,
      year,
      reportGenerated: new Date().toISOString()
    }
  });
});

/**
 * Get Attendance Summary Report
 */
const getAttendanceSummaryReport = asyncHandler(async (req, res) => {
  const { month, year, site_id, company_id } = req.query;

  let whereConditions = ['a.attendance_month IS NOT NULL'];
  let params = [];

  if (month && year) {
    const attendanceMonth = `${year}-${String(month).padStart(2, '0')}`;
    whereConditions.push('a.attendance_month = ?');
    params.push(attendanceMonth);
  }

  if (site_id) {
    whereConditions.push('e.site_id = ?');
    params.push(site_id);
  }

  if (company_id) {
    whereConditions.push('e.company_id = ?');
    params.push(company_id);
  }

  const whereClause = 'WHERE ' + whereConditions.join(' AND ');

  const query = `
    SELECT
      a.attendance_month,
      COUNT(DISTINCT a.employee_id) as total_employees_marked,
      SUM(a.days_present) as total_days_present,
      SUM(a.total_days_in_month - a.days_present) as total_days_absent,
      SUM(CASE WHEN a.status = 'FINALIZED' THEN 1 ELSE 0 END) as finalized_count,
      SUM(CASE WHEN a.status = 'DRAFT' THEN 1 ELSE 0 END) as draft_count,
      ROUND(AVG(a.days_present / a.total_days_in_month * 100), 2) as avg_attendance_percentage
    FROM attendance a
    JOIN employees e ON a.employee_id = e.employee_id
    ${whereClause}
    GROUP BY a.attendance_month
    ORDER BY a.attendance_month DESC
  `;

  const report = await executeQuery(query, params);

  // Calculate overall stats
  const stats = report.reduce((acc, row) => ({
    totalPresent: acc.totalPresent + row.total_days_present,
    totalAbsent: acc.totalAbsent + row.total_days_absent,
    totalEmployees: acc.totalEmployees + row.total_employees_marked
  }), { totalPresent: 0, totalAbsent: 0, totalEmployees: 0 });

  res.json({
    success: true,
    data: report,
    summary: {
      totalMonths: report.length,
      totalPresent: stats.totalPresent,
      totalAbsent: stats.totalAbsent,
      totalEmployees: stats.totalEmployees,
      month: month || 'All',
      year: year || 'All',
      generatedAt: new Date().toISOString()
    }
  });
});

/**
 * Get Designation-wise Report
 */
const getDesignationReport = asyncHandler(async (req, res) => {
  const { company_id } = req.query;

  let whereClause = '';
  let params = [];

  if (company_id) {
    whereClause = 'WHERE e.company_id = ?';
    params.push(company_id);
  }

  const query = `
    SELECT
      e.designation,
      COUNT(e.employee_id) as employee_count,
      AVG(s.net_salary) as avg_salary,
      MIN(s.net_salary) as min_salary,
      MAX(s.net_salary) as max_salary,
      SUM(s.net_salary) as total_salary_cost,
      SUM(CASE WHEN e.status = 'ACTIVE' THEN 1 ELSE 0 END) as active_count
    FROM employees e
    LEFT JOIN salaries s ON e.employee_id = s.employee_id
    ${whereClause}
    GROUP BY e.designation
    ORDER BY employee_count DESC
  `;

  const report = await executeQuery(query, params);

  const totals = report.reduce((acc, row) => ({
    totalEmployees: acc.totalEmployees + row.employee_count,
    totalCost: acc.totalCost + parseFloat(row.total_salary_cost || 0)
  }), { totalEmployees: 0, totalCost: 0 });

  res.json({
    success: true,
    data: report,
    summary: {
      totalDesignations: report.length,
      totalEmployees: totals.totalEmployees,
      totalSalaryCost: totals.totalCost,
      generatedAt: new Date().toISOString()
    }
  });
});

/**
 * Get Custom Date Range Report
 */
const getCustomDateRangeReport = asyncHandler(async (req, res) => {
  const { start_date, end_date, report_type } = req.query;

  if (!start_date || !end_date) {
    return res.status(400).json({
      success: false,
      message: 'Start date and end date are required'
    });
  }

  let query;
  let params = [start_date, end_date];

  switch (report_type) {
    case 'attendance':
      query = `
        SELECT
          a.attendance_month as month,
          COUNT(DISTINCT a.employee_id) as employees_marked,
          SUM(a.days_present) as total_present,
          SUM(a.total_days_in_month - a.days_present) as total_absent
        FROM attendance a
        WHERE a.attendance_month BETWEEN ? AND ?
        GROUP BY a.attendance_month
        ORDER BY a.attendance_month
      `;
      break;

    case 'payroll':
      query = `
        SELECT
          DATE(p.payment_date) as date,
          COUNT(p.payslip_id) as payslips_count,
          SUM(p.net_salary) as total_paid
        FROM payslips p
        WHERE p.payment_date BETWEEN ? AND ?
        GROUP BY DATE(p.payment_date)
        ORDER BY date
      `;
      break;

    default:
      return res.status(400).json({
        success: false,
        message: 'Invalid report type'
      });
  }

  const report = await executeQuery(query, params);

  res.json({
    success: true,
    data: report,
    summary: {
      startDate: start_date,
      endDate: end_date,
      reportType: report_type,
      generatedAt: new Date().toISOString()
    }
  });
});

module.exports = {
  getEmployeeAttendanceReport,
  getEmployeeSalaryReport,
  getSiteEmployeeReport,
  getSiteSalaryCostReport,
  getMonthlyPayrollReport,
  getAttendanceSummaryReport,
  getDesignationReport,
  getCustomDateRangeReport
};
