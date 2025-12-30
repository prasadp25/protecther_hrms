// ===================================
// AUDIT LOGGER UTILITY
// Tracks all changes to important data
// ===================================

const { executeQuery } = require('../config/database');

/**
 * Log an audit event
 * @param {Object} options - Audit log options
 * @param {string} options.tableName - Table that was modified
 * @param {number} options.recordId - ID of the record
 * @param {string} options.action - CREATE, UPDATE, DELETE, LOGIN, LOGOUT, APPROVE, REJECT
 * @param {Object} options.oldValues - Previous values (for UPDATE/DELETE)
 * @param {Object} options.newValues - New values (for CREATE/UPDATE)
 * @param {Object} options.req - Express request object (for user info)
 * @param {string} options.reason - Optional reason for change
 */
const logAudit = async ({
  tableName,
  recordId,
  action,
  oldValues = null,
  newValues = null,
  req = null,
  reason = null
}) => {
  try {
    // Get user info from request
    const userId = req?.user?.user_id || null;
    const userName = req?.user?.username || 'system';
    const userRole = req?.user?.role || 'system';
    const companyId = req?.user?.company_id || null;

    // Get IP address
    const ipAddress = req?.ip ||
      req?.headers?.['x-forwarded-for']?.split(',')[0] ||
      req?.connection?.remoteAddress ||
      'unknown';

    // Get user agent
    const userAgent = req?.headers?.['user-agent'] || 'unknown';

    // Calculate changed fields
    let changedFields = null;
    if (oldValues && newValues) {
      const changes = [];
      const allKeys = new Set([...Object.keys(oldValues), ...Object.keys(newValues)]);
      for (const key of allKeys) {
        if (JSON.stringify(oldValues[key]) !== JSON.stringify(newValues[key])) {
          changes.push(key);
        }
      }
      changedFields = changes.join(', ');
    }

    // Filter sensitive fields from values
    const filterSensitive = (obj) => {
      if (!obj) return null;
      const filtered = { ...obj };
      const sensitiveFields = ['password', 'token', 'secret', 'jwt'];
      for (const field of sensitiveFields) {
        if (filtered[field]) {
          filtered[field] = '[REDACTED]';
        }
      }
      return filtered;
    };

    const query = `
      INSERT INTO audit_logs (
        table_name, record_id, action,
        old_values, new_values, changed_fields,
        user_id, user_name, user_role,
        company_id, ip_address, user_agent, reason
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await executeQuery(query, [
      tableName,
      recordId,
      action,
      oldValues ? JSON.stringify(filterSensitive(oldValues)) : null,
      newValues ? JSON.stringify(filterSensitive(newValues)) : null,
      changedFields,
      userId,
      userName,
      userRole,
      companyId,
      ipAddress,
      userAgent ? userAgent.substring(0, 500) : null,
      reason
    ]);

    console.log(`📝 Audit: ${action} on ${tableName}#${recordId} by ${userName}`);
  } catch (error) {
    // Don't throw - audit logging should not break the main operation
    console.error('⚠️ Audit logging failed:', error.message);
  }
};

/**
 * Log employee creation
 */
const logEmployeeCreate = async (employeeId, employeeData, req) => {
  await logAudit({
    tableName: 'employees',
    recordId: employeeId,
    action: 'CREATE',
    newValues: {
      employee_code: employeeData.employee_code,
      first_name: employeeData.first_name,
      last_name: employeeData.last_name,
      designation: employeeData.designation,
      site_id: employeeData.site_id
    },
    req
  });
};

/**
 * Log employee update
 */
const logEmployeeUpdate = async (employeeId, oldData, newData, req, reason = null) => {
  await logAudit({
    tableName: 'employees',
    recordId: employeeId,
    action: 'UPDATE',
    oldValues: oldData,
    newValues: newData,
    req,
    reason
  });
};

/**
 * Log employee deletion (soft delete)
 */
const logEmployeeDelete = async (employeeId, employeeData, req, reason = null) => {
  await logAudit({
    tableName: 'employees',
    recordId: employeeId,
    action: 'DELETE',
    oldValues: {
      employee_code: employeeData.employee_code,
      first_name: employeeData.first_name,
      last_name: employeeData.last_name,
      status: 'ACTIVE'
    },
    newValues: {
      status: 'INACTIVE'
    },
    req,
    reason
  });
};

/**
 * Log salary creation
 */
const logSalaryCreate = async (salaryId, salaryData, req) => {
  await logAudit({
    tableName: 'salaries',
    recordId: salaryId,
    action: 'CREATE',
    newValues: {
      employee_id: salaryData.employee_id,
      basic_salary: salaryData.basic_salary,
      gross_salary: salaryData.gross_salary,
      net_salary: salaryData.net_salary
    },
    req
  });
};

/**
 * Log salary update
 */
const logSalaryUpdate = async (salaryId, oldData, newData, req, reason = null) => {
  await logAudit({
    tableName: 'salaries',
    recordId: salaryId,
    action: 'UPDATE',
    oldValues: {
      basic_salary: oldData.basic_salary,
      hra: oldData.hra,
      gross_salary: oldData.gross_salary,
      net_salary: oldData.net_salary,
      pf_deduction: oldData.pf_deduction,
      esi_deduction: oldData.esi_deduction
    },
    newValues: {
      basic_salary: newData.basic_salary,
      hra: newData.hra,
      gross_salary: newData.gross_salary,
      net_salary: newData.net_salary,
      pf_deduction: newData.pf_deduction,
      esi_deduction: newData.esi_deduction
    },
    req,
    reason
  });
};

/**
 * Log attendance changes
 */
const logAttendanceUpdate = async (attendanceId, oldData, newData, req, reason = null) => {
  await logAudit({
    tableName: 'attendance',
    recordId: attendanceId,
    action: 'UPDATE',
    oldValues: oldData,
    newValues: newData,
    req,
    reason
  });
};

/**
 * Log attendance finalization
 */
const logAttendanceFinalize = async (month, siteId, count, req) => {
  await logAudit({
    tableName: 'attendance',
    recordId: 0, // Bulk operation
    action: 'APPROVE',
    newValues: {
      month: month,
      site_id: siteId,
      records_finalized: count,
      status: 'FINALIZED'
    },
    req,
    reason: 'Monthly attendance finalized'
  });
};

/**
 * Log payslip generation
 */
const logPayslipCreate = async (payslipId, payslipData, req) => {
  await logAudit({
    tableName: 'payslips',
    recordId: payslipId,
    action: 'CREATE',
    newValues: {
      employee_id: payslipData.employee_id,
      month: payslipData.month,
      net_payable: payslipData.net_payable,
      status: payslipData.status
    },
    req
  });
};

/**
 * Log user login
 */
const logUserLogin = async (userId, username, req, success = true) => {
  await logAudit({
    tableName: 'users',
    recordId: userId || 0,
    action: 'LOGIN',
    newValues: {
      username: username,
      success: success,
      timestamp: new Date().toISOString()
    },
    req
  });
};

/**
 * Log user logout
 */
const logUserLogout = async (userId, req) => {
  await logAudit({
    tableName: 'users',
    recordId: userId,
    action: 'LOGOUT',
    req
  });
};

/**
 * Get audit logs for a specific record
 */
const getAuditLogs = async (tableName, recordId, limit = 50) => {
  const query = `
    SELECT * FROM audit_logs
    WHERE table_name = ? AND record_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `;
  return await executeQuery(query, [tableName, recordId, limit]);
};

/**
 * Get recent audit logs for a user
 */
const getUserAuditLogs = async (userId, limit = 100) => {
  const query = `
    SELECT * FROM audit_logs
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `;
  return await executeQuery(query, [userId, limit]);
};

/**
 * Get all audit logs with pagination
 */
const getAllAuditLogs = async (options = {}) => {
  const {
    page = 1,
    limit = 50,
    tableName = null,
    action = null,
    userId = null,
    companyId = null,
    dateFrom = null,
    dateTo = null
  } = options;

  let whereConditions = [];
  let params = [];

  if (tableName) {
    whereConditions.push('table_name = ?');
    params.push(tableName);
  }

  if (action) {
    whereConditions.push('action = ?');
    params.push(action);
  }

  if (userId) {
    whereConditions.push('user_id = ?');
    params.push(userId);
  }

  if (companyId) {
    whereConditions.push('company_id = ?');
    params.push(companyId);
  }

  if (dateFrom) {
    whereConditions.push('created_at >= ?');
    params.push(dateFrom);
  }

  if (dateTo) {
    whereConditions.push('created_at <= ?');
    params.push(dateTo);
  }

  const whereClause = whereConditions.length > 0
    ? 'WHERE ' + whereConditions.join(' AND ')
    : '';

  const offset = (page - 1) * limit;

  // Get total count
  const countQuery = `SELECT COUNT(*) as total FROM audit_logs ${whereClause}`;
  const countResult = await executeQuery(countQuery, params);
  const total = countResult[0].total;

  // Get data
  const dataQuery = `
    SELECT * FROM audit_logs
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `;
  const logs = await executeQuery(dataQuery, [...params, limit, offset]);

  return {
    data: logs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
};

module.exports = {
  logAudit,
  logEmployeeCreate,
  logEmployeeUpdate,
  logEmployeeDelete,
  logSalaryCreate,
  logSalaryUpdate,
  logAttendanceUpdate,
  logAttendanceFinalize,
  logPayslipCreate,
  logUserLogin,
  logUserLogout,
  getAuditLogs,
  getUserAuditLogs,
  getAllAuditLogs
};
