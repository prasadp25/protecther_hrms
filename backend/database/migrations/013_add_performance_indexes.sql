-- ============================================
-- Migration: 013_add_performance_indexes.sql
-- Description: Add missing indexes for query performance
-- ============================================

-- Use stored procedure to add indexes safely
DELIMITER //

DROP PROCEDURE IF EXISTS add_index_if_not_exists //
CREATE PROCEDURE add_index_if_not_exists(
    IN p_table_name VARCHAR(128),
    IN p_index_name VARCHAR(128),
    IN p_index_columns VARCHAR(256)
)
BEGIN
    DECLARE index_exists INT DEFAULT 0;

    SELECT COUNT(*) INTO index_exists
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = p_table_name
      AND index_name = p_index_name;

    IF index_exists = 0 THEN
        SET @sql = CONCAT('CREATE INDEX ', p_index_name, ' ON ', p_table_name, '(', p_index_columns, ')');
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END //

DELIMITER ;

-- Candidates table indexes
CALL add_index_if_not_exists('candidates', 'idx_candidates_status_company', 'status, company_id');
CALL add_index_if_not_exists('candidates', 'idx_candidates_created_at', 'created_at');
CALL add_index_if_not_exists('candidates', 'idx_candidates_converted_employee', 'converted_employee_id');

-- OTP tokens table indexes
CALL add_index_if_not_exists('otp_tokens', 'idx_otp_employee_id', 'employee_id');
CALL add_index_if_not_exists('otp_tokens', 'idx_otp_expires_used', 'expires_at, used');

-- Payslips table indexes
CALL add_index_if_not_exists('payslips', 'idx_payslips_created_at', 'created_at');
CALL add_index_if_not_exists('payslips', 'idx_payslips_payment_status', 'payment_status');

-- Attendance table indexes
CALL add_index_if_not_exists('attendance', 'idx_attendance_employee_month', 'employee_id, attendance_month');
CALL add_index_if_not_exists('attendance', 'idx_attendance_status', 'status');

-- Notices table index
CALL add_index_if_not_exists('notices', 'idx_notices_created_at', 'created_at');

-- Employees performance indexes
CALL add_index_if_not_exists('employees', 'idx_employees_status_company', 'status, company_id');
CALL add_index_if_not_exists('employees', 'idx_employees_site', 'site_id');

-- Salaries performance indexes
CALL add_index_if_not_exists('salaries', 'idx_salaries_status', 'status');
CALL add_index_if_not_exists('salaries', 'idx_salaries_employee_status', 'employee_id, status');

-- Cleanup procedure
DROP PROCEDURE IF EXISTS add_index_if_not_exists;

SELECT 'Performance indexes migration completed successfully' AS status;
