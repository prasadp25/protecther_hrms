const { executeQuery } = require('../config/database');

// ==============================================
// GET ALL SITES
// ==============================================
const getAllSites = async (req, res) => {
  try {
    const { status, search } = req.query;

    let query = 'SELECT * FROM sites WHERE 1=1';
    const params = [];

    // Add filters
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    if (search) {
      query += ' AND (site_name LIKE ? OR site_code LIKE ? OR location LIKE ?)';
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam);
    }

    query += ' ORDER BY created_at DESC';

    const sites = await executeQuery(query, params);

    res.status(200).json({
      success: true,
      count: sites.length,
      data: sites
    });
  } catch (error) {
    console.error('Get sites error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sites',
      error: error.message
    });
  }
};

// ==============================================
// GET ACTIVE SITES
// ==============================================
const getActiveSites = async (req, res) => {
  try {
    const query = `
      SELECT * FROM sites
      WHERE status = 'ACTIVE'
      ORDER BY site_name
    `;

    const sites = await executeQuery(query);

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

    const query = 'SELECT * FROM sites WHERE site_id = ?';
    const sites = await executeQuery(query, [id]);

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

    // DEBUG: Log what we receive
    console.error('=== CREATE SITE DEBUG ===');
    console.error('Received data:', JSON.stringify(data));
    console.error('Data keys:', Object.keys(data));
    console.error('Has undefined values?', Object.entries(data).filter(([k, v]) => v === undefined));

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
        site_code, site_name, client_name, location,
        site_address, contact_person, contact_mobile, contact_email,
        start_date, end_date, status, remarks
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const result = await executeQuery(query, [
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

    // Check if site exists
    const existing = await executeQuery(
      'SELECT site_id FROM sites WHERE site_id = ?',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Site not found'
      });
    }

    // Build update query dynamically
    const fields = [];
    const values = [];

    Object.keys(siteData).forEach(key => {
      if (siteData[key] !== undefined && key !== 'site_id') {
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

    // Check if site exists
    const existing = await executeQuery(
      'SELECT site_id FROM sites WHERE site_id = ?',
      [id]
    );

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
