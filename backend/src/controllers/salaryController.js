const { executeQuery } = require('../config/database');

// ==============================================
// GET ALL SALARIES
// ==============================================
const getAllSalaries = async (req, res) => {
  try {
    const { status, site_id, employee_id } = req.query;

    let query = `
      SELECT s.*, e.employee_code, e.first_name, e.last_name, e.designation, e.site_id,
             st.site_name, st.site_code
      FROM salaries s
      JOIN employees e ON s.employee_id = e.employee_id
      LEFT JOIN sites st ON e.site_id = st.site_id
      WHERE 1=1
    `;
    const params = [];

    // Add filters
    if (status) {
      query += ' AND s.status = ?';
      params.push(status);
    }

    if (site_id) {
      query += ' AND e.site_id = ?';
      params.push(site_id);
    }

    if (employee_id) {
      query += ' AND s.employee_id = ?';
      params.push(employee_id);
    }

    query += ' ORDER BY s.created_at DESC';

    const salaries = await executeQuery(query, params);

    res.status(200).json({
      success: true,
      count: salaries.length,
      data: salaries
    });
  } catch (error) {
    console.error('Get salaries error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch salaries',
      error: error.message
    });
  }
};

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
    const da = parseFloat(salaryData.da) || 0;
    const conveyanceAllowance = parseFloat(salaryData.conveyance_allowance) || 0;
    const medicalAllowance = parseFloat(salaryData.medical_allowance) || 0;
    const otherAllowances = parseFloat(salaryData.other_allowances) || 0;

    const pf = parseFloat(salaryData.pf) || 0;
    const esi = parseFloat(salaryData.esi) || 0;
    const professionalTax = parseFloat(salaryData.professional_tax) || 0;
    const tds = parseFloat(salaryData.tds) || 0;
    const otherDeductions = parseFloat(salaryData.other_deductions) || 0;

    const grossSalary = basicSalary + hra + da + conveyanceAllowance + medicalAllowance + otherAllowances;
    const totalDeductions = pf + esi + professionalTax + tds + otherDeductions;
    const netSalary = grossSalary - totalDeductions;

    const query = `
      INSERT INTO salaries (
        employee_id, basic_salary, hra, da, conveyance_allowance,
        medical_allowance, other_allowances, gross_salary,
        pf, esi, professional_tax, tds, other_deductions,
        total_deductions, net_salary, effective_from, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      salaryData.employee_id,
      basicSalary,
      hra,
      da,
      conveyanceAllowance,
      medicalAllowance,
      otherAllowances,
      grossSalary,
      pf,
      esi,
      professionalTax,
      tds,
      otherDeductions,
      totalDeductions,
      netSalary,
      salaryData.effective_from || new Date(),
      'ACTIVE'
    ];

    const result = await executeQuery(query, params);

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

    // Recalculate if any salary components are updated
    const basicSalary = parseFloat(salaryData.basic_salary) || 0;
    const hra = parseFloat(salaryData.hra) || 0;
    const da = parseFloat(salaryData.da) || 0;
    const conveyanceAllowance = parseFloat(salaryData.conveyance_allowance) || 0;
    const medicalAllowance = parseFloat(salaryData.medical_allowance) || 0;
    const otherAllowances = parseFloat(salaryData.other_allowances) || 0;

    const pf = parseFloat(salaryData.pf) || 0;
    const esi = parseFloat(salaryData.esi) || 0;
    const professionalTax = parseFloat(salaryData.professional_tax) || 0;
    const tds = parseFloat(salaryData.tds) || 0;
    const otherDeductions = parseFloat(salaryData.other_deductions) || 0;

    const grossSalary = basicSalary + hra + da + conveyanceAllowance + medicalAllowance + otherAllowances;
    const totalDeductions = pf + esi + professionalTax + tds + otherDeductions;
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

    values.push(id);

    const query = `UPDATE salaries SET ${fields.join(', ')} WHERE salary_id = ?`;
    await executeQuery(query, values);

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
