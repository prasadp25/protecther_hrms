const { executeQuery } = require('../config/database');
const { getCompanyFilter, buildCompanyFilter } = require('../middleware/auth');

// ==============================================
// GET ALL NOTICES
// ==============================================
const getAllNotices = async (req, res) => {
  try {
    const { is_active, category } = req.query;
    const companyFilter = buildCompanyFilter('n', req);

    let query = `
      SELECT n.notice_id, n.company_id, n.title, n.content, n.category,
             n.is_active, n.created_by, n.created_at, n.updated_at,
             u.username as created_by_name
      FROM notices n
      JOIN users u ON n.created_by = u.user_id
      WHERE 1=1 ${companyFilter.clause}
    `;
    const params = [...companyFilter.params];

    if (is_active !== undefined) {
      query += ' AND n.is_active = ?';
      params.push(is_active === 'true' || is_active === '1');
    }

    if (category) {
      query += ' AND n.category = ?';
      params.push(category);
    }

    query += ' ORDER BY n.created_at DESC';

    const notices = await executeQuery(query, params);

    res.status(200).json({
      success: true,
      count: notices.length,
      data: notices
    });
  } catch (error) {
    console.error('Get notices error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notices',
      error: error.message
    });
  }
};

// ==============================================
// GET NOTICE BY ID
// ==============================================
const getNoticeById = async (req, res) => {
  try {
    const { id } = req.params;
    const companyFilter = buildCompanyFilter('n', req);

    const query = `
      SELECT n.notice_id, n.company_id, n.title, n.content, n.category,
             n.is_active, n.created_by, n.created_at, n.updated_at,
             u.username as created_by_name
      FROM notices n
      JOIN users u ON n.created_by = u.user_id
      WHERE n.notice_id = ? ${companyFilter.clause}
    `;

    const notices = await executeQuery(query, [id, ...companyFilter.params]);

    if (notices.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Notice not found'
      });
    }

    res.status(200).json({
      success: true,
      data: notices[0]
    });
  } catch (error) {
    console.error('Get notice error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notice',
      error: error.message
    });
  }
};

// ==============================================
// CREATE NOTICE
// ==============================================
const createNotice = async (req, res) => {
  try {
    const { title, content, category, is_active } = req.body;
    const company_id = req.body.company_id || req.user.company_id;

    // Validation
    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: 'Title and content are required'
      });
    }

    if (!company_id) {
      return res.status(400).json({
        success: false,
        message: 'Company ID is required'
      });
    }

    const result = await executeQuery(
      `INSERT INTO notices (company_id, title, content, category, is_active, created_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        company_id,
        title,
        content,
        category || 'GENERAL',
        is_active !== false,
        req.user.user_id
      ]
    );

    const newNotice = await executeQuery(
      `SELECT n.*, u.username as created_by_name
       FROM notices n
       JOIN users u ON n.created_by = u.user_id
       WHERE n.notice_id = ?`,
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: 'Notice created successfully',
      data: newNotice[0]
    });
  } catch (error) {
    console.error('Create notice error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create notice',
      error: error.message
    });
  }
};

// ==============================================
// UPDATE NOTICE
// ==============================================
const updateNotice = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, category, is_active } = req.body;
    const companyFilter = buildCompanyFilter('', req);

    // Check if notice exists
    const existing = await executeQuery(
      `SELECT notice_id FROM notices WHERE notice_id = ? ${companyFilter.clause}`,
      [id, ...companyFilter.params]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Notice not found'
      });
    }

    // Build update query
    const updates = [];
    const params = [];

    if (title !== undefined) {
      updates.push('title = ?');
      params.push(title);
    }
    if (content !== undefined) {
      updates.push('content = ?');
      params.push(content);
    }
    if (category !== undefined) {
      updates.push('category = ?');
      params.push(category);
    }
    if (is_active !== undefined) {
      updates.push('is_active = ?');
      params.push(is_active);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    params.push(id);
    await executeQuery(
      `UPDATE notices SET ${updates.join(', ')} WHERE notice_id = ?`,
      params
    );

    const updated = await executeQuery(
      `SELECT n.*, u.username as created_by_name
       FROM notices n
       JOIN users u ON n.created_by = u.user_id
       WHERE n.notice_id = ?`,
      [id]
    );

    res.status(200).json({
      success: true,
      message: 'Notice updated successfully',
      data: updated[0]
    });
  } catch (error) {
    console.error('Update notice error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update notice',
      error: error.message
    });
  }
};

// ==============================================
// DELETE NOTICE
// ==============================================
const deleteNotice = async (req, res) => {
  try {
    const { id } = req.params;
    const companyFilter = buildCompanyFilter('', req);

    // Check if notice exists
    const existing = await executeQuery(
      `SELECT notice_id FROM notices WHERE notice_id = ? ${companyFilter.clause}`,
      [id, ...companyFilter.params]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Notice not found'
      });
    }

    await executeQuery('DELETE FROM notices WHERE notice_id = ?', [id]);

    res.status(200).json({
      success: true,
      message: 'Notice deleted successfully'
    });
  } catch (error) {
    console.error('Delete notice error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete notice',
      error: error.message
    });
  }
};

module.exports = {
  getAllNotices,
  getNoticeById,
  createNotice,
  updateNotice,
  deleteNotice
};
