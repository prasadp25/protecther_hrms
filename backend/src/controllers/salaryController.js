const { executeQuery } = require('../config/database');
const {
  parsePaginationParams,
  parseSortParams,
  parseSearchParams,
  buildPaginatedResponse
} = require('../utils/pagination');
const { asyncHandler } = require('../utils/errors');
const { logSalaryCreate, logSalaryUpdate } = require('../utils/auditLogger');

// ==============================================
// GET ALL SALARIES (with pagination)
// ==============================================
const getAllSalaries = asyncHandler(async (req, res) => {
  // Parse pagination, sort, and search parameters
  const { page, limit, offset } = parsePaginationParams(req.query);
  const { sortBy, sortOrder } = parseSortParams(req.query,
    ['salary_id', 'employee_id', 'basic_salary', 'net_salary', 'status', 'created_at'],
    'created_at'
  );
  const { status, siteId, search } = parseSearchParams(req.query);
  const employee_id = req.query.employee_id;

  // Build WHERE clause
  let whereConditions = [];
  let params = [];

  if (status) {
    whereConditions.push('s.status = ?');
    params.push(status);
  }

  if (siteId) {
    whereConditions.push('e.site_id = ?');
    params.push(siteId);
  }

  if (employee_id) {
    whereConditions.push('s.employee_id = ?');
    params.push(employee_id);
  }

  if (search) {
    whereConditions.push('(e.first_name LIKE ? OR e.last_name LIKE ? OR e.employee_code LIKE ? OR st.site_name LIKE ?)');
    const searchParam = `%${search}%`;
    params.push(searchParam, searchParam, searchParam, searchParam);
  }

  const whereClause = whereConditions.length > 0
    ? 'WHERE ' + whereConditions.join(' AND ')
    : '';

  // Get total count
  const countQuery = `
    SELECT COUNT(*) as total
    FROM salaries s
    JOIN employees e ON s.employee_id = e.employee_id
    LEFT JOIN sites st ON e.site_id = st.site_id
    ${whereClause}
  `;
  const countResult = await executeQuery(countQuery, params);
  const total = countResult[0].total;

  // Get paginated data
  const dataQuery = `
    SELECT s.*, e.employee_code, e.first_name, e.last_name, e.designation, e.site_id,
           st.site_name, st.site_code
    FROM salaries s
    JOIN employees e ON s.employee_id = e.employee_id
    LEFT JOIN sites st ON e.site_id = st.site_id
    ${whereClause}
    ORDER BY s.${sortBy} ${sortOrder}
    LIMIT ? OFFSET ?
  `;
  const salaries = await executeQuery(dataQuery, [...params, limit, offset]);

  // Send paginated response
  const response = buildPaginatedResponse(salaries, total, page, limit);
  res.json(response);
});

// ==============================================
// GET SALARY BY ID
// ==============================================
const getSalaryById = async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT s.*, e.employee_code, e.first_name, e.last_name, e.designation,
             st.site_name, st.site_code
      FROM salaries s
      JOIN employees e ON s.employee_id = e.employee_id
      LEFT JOIN sites st ON e.site_id = st.site_id
      WHERE s.salary_id = ?
    `;

    const salaries = await executeQuery(query, [id]);

    if (salaries.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Salary record not found'
      });
    }

    res.status(200).json({
      success: true,
      data: salaries[0]
    });
  } catch (error) {
    console.error('Get salary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch salary',
      error: error.message
    });
  }
};

// ==============================================
// GET SALARY BY EMPLOYEE ID
// ==============================================
const getSalaryByEmployeeId = async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT s.*, e.employee_code, e.first_name, e.last_name, e.designation,
             st.site_name, st.site_code
      FROM salaries s
      JOIN employees e ON s.employee_id = e.employee_id
      LEFT JOIN sites st ON e.site_id = st.site_id
      WHERE s.employee_id = ? AND s.status = 'ACTIVE'
      ORDER BY s.effective_from DESC
      LIMIT 1
    `;

    const salaries = await executeQuery(query, [id]);

    if (salaries.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No active salary record found for this employee'
      });
    }

    res.status(200).json({
      success: true,
      data: salaries[0]
    });
  } catch (error) {
    console.error('Get employee salary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch employee salary',
      error: error.message
    });
  }
};

// ==============================================
// CREATE SALARY
// ==============================================
const createSalary = async (req, res) => {
  try {
    const salaryData = req.body;

    // Check if employee exists
    const employee = await executeQuery(
      'SELECT employee_id FROM employees WHERE employee_id = ?',
      [salaryData.employee_id]
    );

    if (employee.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Deactivate previous salary records for this employee
    await executeQuery(
      'UPDATE salaries SET status = ? WHERE employee_id = ? AND status = ?',
      ['INACTIVE', salaryData.employee_id, 'ACTIVE']
    );

    // Calculate gross salary and net salary
    const basicSalary = parseFloat(salaryData.basic_salary) || 0;
    const hra = parseFloat(salaryData.hra) || 0;
    const incentiveAllowance = parseFloat(salaryData.incentive_allowance) || 0;

    const pfDeduction = parseFloat(salaryData.pf_deduction) || 0;
    const esiDeduction = parseFloat(salaryData.esi_deduction) || 0;
    const professionalTax = parseFloat(salaryData.professional_tax) || 0;
    const mediclaimDeduction = parseFloat(salaryData.mediclaim_deduction) || 0;
    const advanceDeduction = parseFloat(salaryData.advance_deduction) || 0;
    const otherDeductions = parseFloat(salaryData.other_deductions) || 0;

    const grossSalary = basicSalary + hra + incentiveAllowance;
    const totalDeductions = pfDeduction + esiDeduction + professionalTax + mediclaimDeduction + advanceDeduction + otherDeductions;
    const netSalary = grossSalary - totalDeductions;

    const query = `
      INSERT INTO salaries (
        employee_id, basic_salary, hra, incentive_allowance, gross_salary,
        pf_deduction, esi_deduction, professional_tax, mediclaim_deduction,
        advance_deduction, other_deductions, total_deductions, net_salary,
        effective_from, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      salaryData.employee_id,
      basicSalary,
      hra,
      incentiveAllowance,
      grossSalary,
      pfDeduction,
      esiDeduction,
      professionalTax,
      mediclaimDeduction,
      advanceDeduction,
      otherDeductions,
      totalDeductions,
      netSalary,
      salaryData.effective_from || new Date(),
      'ACTIVE'
    ];

    const result = await executeQuery(query, params);

    // Log audit trail
    await logSalaryCreate(result.insertId, {
      employee_id: salaryData.employee_id,
      basic_salary: basicSalary,
      gross_salary: grossSalary,
      net_salary: netSalary
    }, req);

    res.status(201).json({
      success: true,
      message: 'Salary created successfully',
      data: {
        salary_id: result.insertId,
        gross_salary: grossSalary,
        net_salary: netSalary
      }
    });
  } catch (error) {
    console.error('Create salary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create salary',
      error: error.message
    });
  }
};

// ==============================================
// UPDATE SALARY
// ==============================================
const updateSalary = async (req, res) => {
  try {
    const { id } = req.params;
    const salaryData = req.body;

    // Get existing salary for audit log
    const existing = await executeQuery(
      'SELECT * FROM salaries WHERE salary_id = ?',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Salary record not found'
      });
    }

    const oldSalaryData = existing[0];

    // Recalculate if any salary components are updated
    const basicSalary = parseFloat(salaryData.basic_salary) || 0;
    const hra = parseFloat(salaryData.hra) || 0;
    const incentiveAllowance = parseFloat(salaryData.incentive_allowance) || 0;

    const pfDeduction = parseFloat(salaryData.pf_deduction) || 0;
    const esiDeduction = parseFloat(salaryData.esi_deduction) || 0;
    const professionalTax = parseFloat(salaryData.professional_tax) || 0;
    const mediclaimDeduction = parseFloat(salaryData.mediclaim_deduction) || 0;
    const advanceDeduction = parseFloat(salaryData.advance_deduction) || 0;
    const otherDeductions = parseFloat(salaryData.other_deductions) || 0;

    const grossSalary = basicSalary + hra + incentiveAllowance;
    const totalDeductions = pfDeduction + esiDeduction + professionalTax + mediclaimDeduction + advanceDeduction + otherDeductions;
    const netSalary = grossSalary - totalDeductions;

    // Add calculated fields
    salaryData.gross_salary = grossSalary;
    salaryData.total_deductions = totalDeductions;
    salaryData.net_salary = netSalary;

    // Build update query dynamically
    const fields = [];
    const values = [];

    Object.keys(salaryData).forEach(key => {
      if (salaryData[key] !== undefined && key !== 'salary_id' && key !== 'employee_id') {
        fields.push(`${key} = ?`);
        values.push(salaryData[key]);
      }
    });

    if (fields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    // Add changed_by for audit
    fields.push('changed_by = ?');
    values.push(req.user?.user_id || null);
    values.push(id);

    const query = `UPDATE salaries SET ${fields.join(', ')} WHERE salary_id = ?`;
    await executeQuery(query, values);

    // Log audit trail
    await logSalaryUpdate(id, oldSalaryData, {
      basic_salary: basicSalary,
      hra: hra,
      gross_salary: grossSalary,
      net_salary: netSalary,
      pf_deduction: pfDeduction,
      esi_deduction: esiDeduction
    }, req, salaryData.change_reason || null);

    res.status(200).json({
      success: true,
      message: 'Salary updated successfully',
      data: {
        gross_salary: grossSalary,
        net_salary: netSalary
      }
    });
  } catch (error) {
    console.error('Update salary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update salary',
      error: error.message
    });
  }
};

// ==============================================
// DELETE SALARY (Soft Delete)
// ==============================================
const deleteSalary = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if salary exists
    const existing = await executeQuery(
      'SELECT salary_id FROM salaries WHERE salary_id = ?',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Salary record not found'
      });
    }

    // Soft delete - set status to INACTIVE
    await executeQuery(
      'UPDATE salaries SET status = ? WHERE salary_id = ?',
      ['INACTIVE', id]
    );

    res.status(200).json({
      success: true,
      message: 'Salary deactivated successfully'
    });
  } catch (error) {
    console.error('Delete salary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete salary',
      error: error.message
    });
  }
};

// ==============================================
// GET SALARY SUMMARY
// ==============================================
const getSalarySummary = async (req, res) => {
  try {
    const { site_id, month } = req.query;

    let query = `
      SELECT
        COUNT(DISTINCT s.employee_id) as employee_count,
        SUM(s.gross_salary) as total_gross,
        SUM(s.total_deductions) as total_deductions,
        SUM(s.net_salary) as total_net,
        AVG(s.gross_salary) as avg_gross_salary
      FROM salaries s
      JOIN employees e ON s.employee_id = e.employee_id
      WHERE s.status = 'ACTIVE' AND e.status = 'ACTIVE'
    `;
    const params = [];

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
    console.error('Get salary summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch salary summary',
      error: error.message
    });
  }
};

// ==============================================
// GET SITE-WISE SALARY REPORT
// ==============================================
const getSiteWiseSalaryReport = async (req, res) => {
  try {
    const query = `
      SELECT
        st.site_id, st.site_code, st.site_name,
        COUNT(DISTINCT s.employee_id) as employee_count,
        SUM(s.gross_salary) as total_gross,
        SUM(s.total_deductions) as total_deductions,
        SUM(s.net_salary) as total_net
      FROM salaries s
      JOIN employees e ON s.employee_id = e.employee_id
      LEFT JOIN sites st ON e.site_id = st.site_id
      WHERE s.status = 'ACTIVE' AND e.status = 'ACTIVE'
      GROUP BY st.site_id, st.site_code, st.site_name
      ORDER BY st.site_name
    `;

    const report = await executeQuery(query);

    res.status(200).json({
      success: true,
      count: report.length,
      data: report
    });
  } catch (error) {
    console.error('Get site-wise salary report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch site-wise salary report',
      error: error.message
    });
  }
};

module.exports = {
  getAllSalaries,
  getSalaryById,
  getSalaryByEmployeeId,
  createSalary,
  updateSalary,
  deleteSalary,
  getSalarySummary,
  getSiteWiseSalaryReport
};
