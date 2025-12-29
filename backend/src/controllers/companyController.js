const { executeQuery } = require('../config/database');
const {
  parsePaginationParams,
  parseSortParams,
  parseSearchParams,
  buildPaginatedResponse
} = require('../utils/pagination');
const { asyncHandler } = require('../utils/errors');

// ==============================================
// GET ALL COMPANIES (with pagination)
// Only accessible by SUPER_ADMIN
// ==============================================
const getAllCompanies = asyncHandler(async (req, res) => {
  // Parse pagination, sort, and search parameters
  const { page, limit, offset } = parsePaginationParams(req.query);
  const { sortBy, sortOrder } = parseSortParams(req.query,
    ['company_id', 'company_code', 'company_name', 'status', 'created_at'],
    'created_at'
  );
  const { status, search } = parseSearchParams(req.query);

  // Build WHERE clause
  let whereConditions = [];
  let params = [];

  if (status) {
    whereConditions.push('status = ?');
    params.push(status);
  }

  if (search) {
    whereConditions.push('(company_name LIKE ? OR company_code LIKE ? OR city LIKE ?)');
    const searchParam = `%${search}%`;
    params.push(searchParam, searchParam, searchParam);
  }

  const whereClause = whereConditions.length > 0
    ? 'WHERE ' + whereConditions.join(' AND ')
    : '';

  // Get total count
  const countQuery = `SELECT COUNT(*) as total FROM companies ${whereClause}`;
  const countResult = await executeQuery(countQuery, params);
  const total = countResult[0].total;

  // Get paginated data
  const dataQuery = `
    SELECT * FROM companies
    ${whereClause}
    ORDER BY ${sortBy} ${sortOrder}
    LIMIT ? OFFSET ?
  `;
  const companies = await executeQuery(dataQuery, [...params, limit, offset]);

  // Send paginated response
  const response = buildPaginatedResponse(companies, total, page, limit);
  res.json(response);
});

// ==============================================
// GET ACTIVE COMPANIES
// For dropdown selection
// ==============================================
const getActiveCompanies = asyncHandler(async (req, res) => {
  const query = `
    SELECT company_id, company_code, company_name, logo_url
    FROM companies
    WHERE status = 'ACTIVE'
    ORDER BY company_name
  `;

  const companies = await executeQuery(query);

  res.status(200).json({
    success: true,
    count: companies.length,
    data: companies
  });
});

// ==============================================
// GET COMPANY BY ID
// ==============================================
const getCompanyById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const query = 'SELECT * FROM companies WHERE company_id = ?';
  const companies = await executeQuery(query, [id]);

  if (companies.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'Company not found'
    });
  }

  res.status(200).json({
    success: true,
    data: companies[0]
  });
});

// ==============================================
// CREATE COMPANY
// Only accessible by SUPER_ADMIN
// ==============================================
const createCompany = asyncHandler(async (req, res) => {
  const data = req.body;

  // Validate required fields
  if (!data.company_name) {
    return res.status(400).json({
      success: false,
      message: 'Company name is required'
    });
  }

  // Generate company code if not provided
  let companyCode = data.company_code;
  if (!companyCode) {
    const lastCompanyResult = await executeQuery(
      'SELECT company_code FROM companies ORDER BY company_id DESC LIMIT 1'
    );

    if (lastCompanyResult.length > 0 && lastCompanyResult[0].company_code !== 'DEFAULT') {
      const lastCode = lastCompanyResult[0].company_code;
      const num = parseInt(lastCode.replace(/[^0-9]/g, '')) + 1;
      companyCode = `COMP${String(num).padStart(3, '0')}`;
    } else {
      companyCode = 'COMP001';
    }
  }

  const query = `
    INSERT INTO companies (
      company_code, company_name, legal_name, registration_number,
      gst_number, pan_number, address, city, state, pincode,
      country, phone, email, website, logo_url, settings, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const result = await executeQuery(query, [
    companyCode,
    data.company_name,
    data.legal_name || null,
    data.registration_number || null,
    data.gst_number || null,
    data.pan_number || null,
    data.address || null,
    data.city || null,
    data.state || null,
    data.pincode || null,
    data.country || 'India',
    data.phone || null,
    data.email || null,
    data.website || null,
    data.logo_url || null,
    data.settings ? JSON.stringify(data.settings) : null,
    data.status || 'ACTIVE'
  ]);

  res.status(201).json({
    success: true,
    message: 'Company created successfully',
    data: {
      company_id: result.insertId,
      company_code: companyCode
    }
  });
});

// ==============================================
// UPDATE COMPANY
// Only accessible by SUPER_ADMIN
// ==============================================
const updateCompany = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const companyData = req.body;

  // Check if company exists
  const existing = await executeQuery(
    'SELECT company_id FROM companies WHERE company_id = ?',
    [id]
  );

  if (existing.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'Company not found'
    });
  }

  // Build update query dynamically
  const fields = [];
  const values = [];

  const allowedFields = [
    'company_name', 'legal_name', 'registration_number', 'gst_number',
    'pan_number', 'address', 'city', 'state', 'pincode', 'country',
    'phone', 'email', 'website', 'logo_url', 'settings', 'status'
  ];

  allowedFields.forEach(key => {
    if (companyData[key] !== undefined) {
      fields.push(`${key} = ?`);
      if (key === 'settings' && typeof companyData[key] === 'object') {
        values.push(JSON.stringify(companyData[key]));
      } else {
        values.push(companyData[key]);
      }
    }
  });

  if (fields.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No fields to update'
    });
  }

  values.push(id);

  const query = `UPDATE companies SET ${fields.join(', ')} WHERE company_id = ?`;
  await executeQuery(query, values);

  res.status(200).json({
    success: true,
    message: 'Company updated successfully'
  });
});

// ==============================================
// DELETE COMPANY (Soft Delete)
// Only accessible by SUPER_ADMIN
// ==============================================
const deleteCompany = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Check if company exists
  const existing = await executeQuery(
    'SELECT company_id, company_code FROM companies WHERE company_id = ?',
    [id]
  );

  if (existing.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'Company not found'
    });
  }

  // Prevent deletion of DEFAULT company
  if (existing[0].company_code === 'DEFAULT') {
    return res.status(400).json({
      success: false,
      message: 'Cannot delete the default company'
    });
  }

  // Check if company has active users
  const users = await executeQuery(
    'SELECT COUNT(*) as count FROM users WHERE company_id = ? AND status = ?',
    [id, 'ACTIVE']
  );

  if (users[0].count > 0) {
    return res.status(400).json({
      success: false,
      message: 'Cannot delete company with active users. Please reassign or deactivate users first.'
    });
  }

  // Check if company has active employees
  const employees = await executeQuery(
    'SELECT COUNT(*) as count FROM employees WHERE company_id = ? AND status = ?',
    [id, 'ACTIVE']
  );

  if (employees[0].count > 0) {
    return res.status(400).json({
      success: false,
      message: 'Cannot delete company with active employees. Please reassign or deactivate employees first.'
    });
  }

  // Soft delete - set status to INACTIVE
  await executeQuery(
    'UPDATE companies SET status = ? WHERE company_id = ?',
    ['INACTIVE', id]
  );

  res.status(200).json({
    success: true,
    message: 'Company deactivated successfully'
  });
});

// ==============================================
// GET COMPANY STATISTICS
// ==============================================
const getCompanyStats = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Get employee count
  const employeeCount = await executeQuery(
    'SELECT COUNT(*) as count FROM employees WHERE company_id = ? AND status = ?',
    [id, 'ACTIVE']
  );

  // Get site count
  const siteCount = await executeQuery(
    'SELECT COUNT(*) as count FROM sites WHERE company_id = ? AND status = ?',
    [id, 'ACTIVE']
  );

  // Get user count
  const userCount = await executeQuery(
    'SELECT COUNT(*) as count FROM users WHERE company_id = ? AND status = ?',
    [id, 'ACTIVE']
  );

  // Get total salary cost
  const salaryCost = await executeQuery(
    `SELECT SUM(s.gross_salary) as total_cost
     FROM salaries s
     JOIN employees e ON s.employee_id = e.employee_id
     WHERE e.company_id = ? AND s.status = ? AND e.status = ?`,
    [id, 'ACTIVE', 'ACTIVE']
  );

  res.status(200).json({
    success: true,
    data: {
      employee_count: employeeCount[0].count,
      site_count: siteCount[0].count,
      user_count: userCount[0].count,
      total_salary_cost: salaryCost[0].total_cost || 0
    }
  });
});

// ==============================================
// GET ALL COMPANIES SUMMARY (for dashboard)
// ==============================================
const getCompaniesSummary = asyncHandler(async (req, res) => {
  const query = `
    SELECT
      c.company_id,
      c.company_code,
      c.company_name,
      c.status,
      (SELECT COUNT(*) FROM employees e WHERE e.company_id = c.company_id AND e.status = 'ACTIVE') as employee_count,
      (SELECT COUNT(*) FROM sites s WHERE s.company_id = c.company_id AND s.status = 'ACTIVE') as site_count,
      (SELECT COUNT(*) FROM users u WHERE u.company_id = c.company_id AND u.status = 'ACTIVE') as user_count
    FROM companies c
    WHERE c.status = 'ACTIVE'
    ORDER BY c.company_name
  `;

  const companies = await executeQuery(query);

  res.status(200).json({
    success: true,
    count: companies.length,
    data: companies
  });
});

module.exports = {
  getAllCompanies,
  getActiveCompanies,
  getCompanyById,
  createCompany,
  updateCompany,
  deleteCompany,
  getCompanyStats,
  getCompaniesSummary
};
