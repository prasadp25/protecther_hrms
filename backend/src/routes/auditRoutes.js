const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { getAllAuditLogs, getAuditLogs } = require('../utils/auditLogger');

// Only ADMIN and SUPER_ADMIN can view audit logs
const adminOnly = authorizeRoles('ADMIN', 'SUPER_ADMIN');

// ==============================================
// GET ALL AUDIT LOGS (with filters)
// ==============================================
router.get('/', authenticateToken, adminOnly, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      table_name,
      action,
      user_id,
      date_from,
      date_to
    } = req.query;

    const result = await getAllAuditLogs({
      page: parseInt(page),
      limit: parseInt(limit),
      tableName: table_name,
      action: action,
      userId: user_id ? parseInt(user_id) : null,
      companyId: req.user.company_id,
      dateFrom: date_from,
      dateTo: date_to
    });

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch audit logs',
      error: error.message
    });
  }
});

// ==============================================
// GET AUDIT LOGS FOR SPECIFIC RECORD
// ==============================================
router.get('/:tableName/:recordId', authenticateToken, adminOnly, async (req, res) => {
  try {
    const { tableName, recordId } = req.params;
    const { limit = 50 } = req.query;

    const logs = await getAuditLogs(tableName, parseInt(recordId), parseInt(limit));

    res.json({
      success: true,
      count: logs.length,
      data: logs
    });
  } catch (error) {
    console.error('Error fetching record audit logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch audit logs',
      error: error.message
    });
  }
});

module.exports = router;
