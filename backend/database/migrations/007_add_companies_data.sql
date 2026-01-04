-- ==============================================
-- Add Companies Data for Production
-- Run this after 005_add_multi_company_support.sql
-- ==============================================

USE hrms_db;

-- ==============================================
-- INSERT THE 4 COMPANIES
-- ==============================================

-- First, remove the DEFAULT company if it exists and has no data
-- DELETE FROM companies WHERE company_code = 'DEFAULT';

-- Insert the 4 actual companies
INSERT INTO companies (company_code, company_name, status) VALUES
('PROTECTHER', 'PROTECTHER LLP', 'ACTIVE'),
('EHS', 'EHS Staffing', 'ACTIVE'),
('S&S', 'S & S', 'ACTIVE'),
('PFSMI', 'PFSMI', 'ACTIVE')
ON DUPLICATE KEY UPDATE company_name = VALUES(company_name), status = VALUES(status);

-- ==============================================
-- VERIFY COMPANIES ADDED
-- ==============================================
SELECT company_id, company_code, company_name, status FROM companies;

-- ==============================================
-- OPTIONAL: Update existing data to correct company
-- Uncomment and modify as needed
-- ==============================================

-- Example: If all existing employees belong to S&S
-- UPDATE employees SET company_id = (SELECT company_id FROM companies WHERE company_code = 'S&S') WHERE company_id IS NULL OR company_id = 1;

-- Example: If all existing sites belong to S&S
-- UPDATE sites SET company_id = (SELECT company_id FROM companies WHERE company_code = 'S&S') WHERE company_id IS NULL OR company_id = 1;

-- Example: If all existing salaries belong to S&S
-- UPDATE salaries SET company_id = (SELECT company_id FROM companies WHERE company_code = 'S&S') WHERE company_id IS NULL OR company_id = 1;

-- ==============================================
-- CREATE SUPER_ADMIN USER
-- ==============================================
-- Username: superadmin
-- Password: SuperAdmin@123 (CHANGE THIS AFTER FIRST LOGIN!)

INSERT INTO users (username, email, password_hash, role, company_id, status) VALUES
('superadmin', 'superadmin@hrms.com', '$2b$10$cfqJXs1//JNP1cbNQrWK2uTJANxJVu3vmXtUovZsz8XsKWTxaDs5O', 'SUPER_ADMIN', NULL, 'ACTIVE')
ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), role = 'SUPER_ADMIN', status = 'ACTIVE';

-- ==============================================
-- VERIFY SUPER_ADMIN CREATED
-- ==============================================
SELECT user_id, username, email, role, company_id, status FROM users WHERE role = 'SUPER_ADMIN';

-- ==============================================
-- NOTES FOR PRODUCTION:
-- ==============================================
-- 1. First run: 005_add_multi_company_support.sql (if not already done)
-- 2. Then run: this file (007_add_companies_data.sql)
-- 3. Update existing data to correct company if needed
-- 4. Login as superadmin / SuperAdmin@123
-- 5. CHANGE THE PASSWORD IMMEDIATELY!
