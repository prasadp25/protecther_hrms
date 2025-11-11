const { executeQuery } = require('../config/database');

/**
 * Audit Logger Middleware
 * Logs all CREATE, UPDATE, DELETE operations for security tracking
 */

const auditLog = (action, tableName) => {
  return async (req, res, next) => {
    // Store original json method
    const originalJson = res.json;
    
    // Override json method to capture response
    res.json = async function(data) {
      // Only log successful operations (2xx status codes)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          const userId = req.user?.user_id || null;
          const recordId = req.params.id || data?.data?.id || data?.data?.employee_id || null;
          
          // Capture old and new values for UPDATE operations
          let oldValue = null;
          let newValue = null;
          
          if (action === 'UPDATE') {
            oldValue = JSON.stringify(req.oldRecord || null);
            newValue = JSON.stringify(req.body || null);
          } else if (action === 'CREATE') {
            newValue = JSON.stringify(req.body || null);
          }
          
          // Insert audit log
          await executeQuery(
            `INSERT INTO audit_logs 
             (user_id, action, table_name, record_id, old_value, new_value, ip_address, user_agent, created_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
              userId,
              action,
              tableName,
              recordId,
              oldValue,
              newValue,
              req.ip || req.connection.remoteAddress,
              req.get('user-agent') || 'Unknown'
            ]
          );
        } catch (error) {
          // Log error but don't fail the request
          console.error('Audit log error:', error);
        }
      }
      
      // Call original json method
      originalJson.call(this, data);
    };
    
    next();
  };
};

/**
 * Custom audit log for specific events
 */
const logCustomEvent = async (userId, action, tableName, details) => {
  try {
    await executeQuery(
      `INSERT INTO audit_logs 
       (user_id, action, table_name, record_id, new_value, ip_address, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [
        userId,
        action,
        tableName,
        null,
        JSON.stringify(details),
        'system'
      ]
    );
  } catch (error) {
    console.error('Custom audit log error:', error);
  }
};

module.exports = {
  auditLog,
  logCustomEvent
};
