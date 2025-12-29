const { executeQuery } = require('../config/database');
const {
  parsePaginationParams,
  parseSortParams,
  parseSearchParams,
  buildPaginatedResponse
} = require('../utils/pagination');
const { asyncHandler } = require('../utils/errors');
const { getCompanyFilter } = require('../middleware/auth');

// ==============================================
// GET ALL SITES (with pagination)
// ==============================================
const getAllSites = asyncHandler(async (req, res) => {
  // Parse pagination, sort, and search parameters
  const { page, limit, offset } = parsePaginationParams(req.query);
  const { sortBy, sortOrder } = parseSortParams(req.query,
    ['site_id', 'site_code', 'site_name', 'location', 'status', 'created_at'],
    'created_at'
  );
  const { status, search } = parseSearchParams(req.query);

  // Build WHERE clause
  let whereConditions = [];
  let params = [];

  // Company filter - restrict to user's company
  const companyId = getCompanyFilter(req);
  if (companyId) {
    whereConditions.push('company_id = ?');
    params.push(companyId);
  }

  if (status) {
    whereConditions.push('status = ?');
    params.push(status);
  }

  if (search) {
    whereConditions.push('(site_name LIKE ? OR site_code LIKE ? OR location LIKE ? OR client_name LIKE ?)');
    const searchParam = `%${search}%`;
    params.push(searchParam, searchParam, searchParam, searchParam);
  }

  const whereClause = whereConditions.length > 0
    ? 'WHERE ' + whereConditions.join(' AND ')
    : '';

  // Get total count
  const countQuery = `SELECT COUNT(*) as total FROM sites ${whereClause}`;
  const countResult = await executeQuery(countQuery, params);
  const total = countResult[0].total;

  // Get paginated data
  const dataQuery = `
    SELECT * FROM sites
    ${whereClause}
    ORDER BY ${sortBy} ${sortOrder}
    LIMIT ? OFFSET ?
  `;
  const sites = await executeQuery(dataQuery, [...params, limit, offset]);

  // Send paginated response
  const response = buildPaginatedResponse(sites, total, page, limit);
  res.json(response);
});

// ==============================================
// GET ACTIVE SITES
// ==============================================
const getActiveSites = async (req, res) => {
  try {
    const companyId = getCompanyFilter(req);
    let query = `
      SELECT * FROM sites
      WHERE status = 'ACTIVE'
    `;
    const params = [];

    if (companyId) {
      query += ` AND company_id = ?`;
      params.push(companyId);
    }

    query += ` ORDER BY site_name`;

    const sites = await executeQuery(query, params);

    res.status(200).json({
      success: true,
      count: sites.length,
      data: sites
    });
  } catch (error) {
    console.error('Get active sites error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch active sites',
      error: error.message
    });
  }
};

// ==============================================
// GET SITE BY ID
// ==============================================
const getSiteById = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = getCompanyFilter(req);

    let query = 'SELECT * FROM sites WHERE site_id = ?';
    const params = [id];

    if (companyId) {
      query += ' AND company_id = ?';
      params.push(companyId);
    }

    const sites = await executeQuery(query, params);

    if (sites.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Site not found'
      });
    }

    res.status(200).json({
      success: true,
      data: sites[0]
    });
  } catch (error) {
    console.error('Get site error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch site',
      error: error.message
    });
  }
};

// ==============================================
// CREATE SITE - COMPLETELY REWRITTEN
// ==============================================
const createSite = async (req, res) => {
  try {
    const data = req.body;
    const companyId = getCompanyFilter(req);

    // For non-SUPER_ADMIN users, company_id is required
    if (!companyId && req.user.role !== 'SUPER_ADMIN') {
      return res.status(400).json({
        success: false,
        message: 'Company context is required'
      });
    }

    // SUPER_ADMIN must provide company_id in request body
    const targetCompanyId = companyId || data.company_id;
    if (!targetCompanyId) {
      return res.status(400).json({
        success: false,
        message: 'Company ID is required'
      });
    }

    // Extract and validate required fields
    const siteName = data.siteName || data.site_name;
    if (!siteName) {
      return res.status(400).json({
        success: false,
        message: 'Site name is required'
      });
    }

    // Generate site code
    const lastSiteResult = await executeQuery(
      'SELECT site_code FROM sites ORDER BY site_id DESC LIMIT 1'
    );

    let siteCode;
    if (lastSiteResult.length > 0) {
      const lastCode = lastSiteResult[0].site_code;
      const num = parseInt(lastCode.replace(/[^0-9]/g, '')) + 1;
      siteCode = `SITE${String(num).padStart(3, '0')}`;
    } else {
      siteCode = 'SITE001';
    }

    // Prepare values with explicit null handling
    const values = {
      company_id: targetCompanyId,
      site_code: siteCode,
      site_name: siteName,
      client_name: data.clientName || data.client_name || null,
      location: data.projectType || data.location || null,
      site_address: data.siteAddress || data.site_address || null,
      contact_person: data.clientContactPerson || data.contact_person || null,
      contact_mobile: data.clientMobile || data.contact_mobile || null,
      contact_email: data.clientEmail || data.contact_email || null,
      start_date: data.startDate || data.start_date || null,
      end_date: data.expectedEndDate || data.end_date || null,
      status: data.status || 'ACTIVE',
      remarks: data.remarks || null
    };

    const query = `
      INSERT INTO sites (
        company_id, site_code, site_name, client_name, location,
        site_address, contact_person, contact_mobile, contact_email,
        start_date, end_date, status, remarks
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const result = await executeQuery(query, [
      values.company_id,
      values.site_code,
      values.site_name,
      values.client_name,
      values.location,
      values.site_address,
      values.contact_person,
      values.contact_mobile,
      values.contact_email,
      values.start_date,
      values.end_date,
      values.status,
      values.remarks
    ]);

    res.status(201).json({
      success: true,
      message: 'Site created successfully',
      data: {
        site_id: result.insertId,
        site_code: siteCode
      }
    });
  } catch (error) {
    console.error('Create site error:', error);

    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        message: 'Site with this code already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create site',
      error: error.message
    });
  }
};

// ==============================================
// UPDATE SITE
// ==============================================
const updateSite = async (req, res) => {
  try {
    const { id } = req.params;
    const siteData = req.body;
    const companyId = getCompanyFilter(req);

    // Check if site exists (within user's company)
    let checkQuery = 'SELECT site_id FROM sites WHERE site_id = ?';
    const checkParams = [id];

    if (companyId) {
      checkQuery += ' AND company_id = ?';
      checkParams.push(companyId);
    }

    const existing = await executeQuery(checkQuery, checkParams);

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Site not found'
      });
    }

    // Build update query dynamically (exclude company_id from update for non-SUPER_ADMIN)
    const fields = [];
    const values = [];
    const excludeFields = ['site_id', 'company_id'];

    Object.keys(siteData).forEach(key => {
      if (siteData[key] !== undefined && !excludeFields.includes(key)) {
        fields.push(`${key} = ?`);
        values.push(siteData[key]);
      }
    });

    if (fields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    values.push(id);

    const query = `UPDATE sites SET ${fields.join(', ')} WHERE site_id = ?`;
    await executeQuery(query, values);

    res.status(200).json({
      success: true,
      message: 'Site updated successfully'
    });
  } catch (error) {
    console.error('Update site error:', error);

    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        message: 'Site with this code already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update site',
      error: error.message
    });
  }
};

// ==============================================
// DELETE SITE (Soft Delete)
// ==============================================
const deleteSite = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = getCompanyFilter(req);

    // Check if site exists (within user's company)
    let checkQuery = 'SELECT site_id FROM sites WHERE site_id = ?';
    const checkParams = [id];

    if (companyId) {
      checkQuery += ' AND company_id = ?';
      checkParams.push(companyId);
    }

    const existing = await executeQuery(checkQuery, checkParams);

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Site not found'
      });
    }

    // Check if site has employees assigned
    const employees = await executeQuery(
      'SELECT COUNT(*) as count FROM employees WHERE site_id = ? AND status = ?',
      [id, 'ACTIVE']
    );

    if (employees[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete site with active employees. Please reassign employees first.'
      });
    }

    // Soft delete - set status to INACTIVE
    await executeQuery(
      'UPDATE sites SET status = ? WHERE site_id = ?',
      ['INACTIVE', id]
    );

    res.status(200).json({
      success: true,
      message: 'Site deactivated successfully'
    });
  } catch (error) {
    console.error('Delete site error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete site',
      error: error.message
    });
  }
};

// ==============================================
// GET SITE STATISTICS
// ==============================================
const getSiteStats = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = getCompanyFilter(req);

    // Verify site belongs to user's company
    if (companyId) {
      const siteCheck = await executeQuery(
        'SELECT site_id FROM sites WHERE site_id = ? AND company_id = ?',
        [id, companyId]
      );
      if (siteCheck.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Site not found'
        });
      }
    }

    // Get employee count
    const employeeCount = await executeQuery(
      'SELECT COUNT(*) as count FROM employees WHERE site_id = ? AND status = ?',
      [id, 'ACTIVE']
    );

    // Get total salary cost
    const salaryCost = await executeQuery(
      `SELECT SUM(s.gross_salary) as total_cost
       FROM salaries s
       JOIN employees e ON s.employee_id = e.employee_id
       WHERE e.site_id = ? AND s.status = ? AND e.status = ?`,
      [id, 'ACTIVE', 'ACTIVE']
    );

    res.status(200).json({
      success: true,
      data: {
        employee_count: employeeCount[0].count,
        total_salary_cost: salaryCost[0].total_cost || 0
      }
    });
  } catch (error) {
    console.error('Get site stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch site statistics',
      error: error.message
    });
  }
};

module.exports = {
  getAllSites,
  getActiveSites,
  getSiteById,
  createSite,
  updateSite,
  deleteSite,
  getSiteStats
};
