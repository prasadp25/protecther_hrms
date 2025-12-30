-- =============================================
-- AUDIT LOGS TABLE
-- Tracks all changes to important data
-- =============================================

CREATE TABLE IF NOT EXISTS audit_logs (
    log_id INT PRIMARY KEY AUTO_INCREMENT,

    -- What was changed
    table_name VARCHAR(50) NOT NULL,           -- 'employees', 'salaries', 'attendance', etc.
    record_id INT NOT NULL,                     -- ID of the record that was changed

    -- What action was performed
    action ENUM('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'APPROVE', 'REJECT') NOT NULL,

    -- What changed (JSON format)
    old_values JSON,                            -- Values before change (NULL for CREATE)
    new_values JSON,                            -- Values after change (NULL for DELETE)
    changed_fields TEXT,                        -- Comma-separated list of changed field names

    -- Who made the change
    user_id INT,                                -- User who made the change
    user_name VARCHAR(100),                     -- Username (for reference if user deleted)
    user_role VARCHAR(50),                      -- Role at time of change

    -- Context
    company_id INT,                             -- Company context
    ip_address VARCHAR(45),                     -- IP address of request
    user_agent VARCHAR(500),                    -- Browser/client info

    -- Additional info
    reason VARCHAR(500),                        -- Optional reason for change

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Indexes for fast queries
    INDEX idx_audit_table_record (table_name, record_id),
    INDEX idx_audit_user (user_id),
    INDEX idx_audit_action (action),
    INDEX idx_audit_created (created_at),
    INDEX idx_audit_company (company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- ADD AUDIT COLUMNS TO SALARIES TABLE
-- =============================================

ALTER TABLE salaries
ADD COLUMN IF NOT EXISTS changed_by INT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS change_reason VARCHAR(255) DEFAULT NULL;

-- =============================================
-- ADD AUDIT COLUMNS TO EMPLOYEES TABLE
-- =============================================

ALTER TABLE employees
ADD COLUMN IF NOT EXISTS last_modified_by INT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS last_modified_at TIMESTAMP DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP;

-- =============================================
-- SAMPLE QUERY: Get all changes for an employee
-- =============================================
-- SELECT * FROM audit_logs
-- WHERE table_name = 'employees' AND record_id = 123
-- ORDER BY created_at DESC;

-- =============================================
-- SAMPLE QUERY: Get all changes by a user
-- =============================================
-- SELECT * FROM audit_logs
-- WHERE user_id = 456
-- ORDER BY created_at DESC
-- LIMIT 100;

-- =============================================
-- SAMPLE QUERY: Get salary changes with reason
-- =============================================
-- SELECT al.*, e.first_name, e.last_name
-- FROM audit_logs al
-- LEFT JOIN employees e ON al.record_id = e.employee_id
-- WHERE al.table_name = 'salaries'
-- ORDER BY al.created_at DESC;
