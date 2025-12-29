-- ==============================================
-- Multi-Company Support Migration
-- This migration adds company isolation to the HRMS
-- ==============================================

USE hrms_db;

-- ==============================================
-- 1. CREATE COMPANIES TABLE
-- ==============================================
CREATE TABLE IF NOT EXISTS companies (
    company_id INT AUTO_INCREMENT PRIMARY KEY,
    company_code VARCHAR(50) UNIQUE NOT NULL,
    company_name VARCHAR(255) NOT NULL,

    -- Company Details
    legal_name VARCHAR(255),
    registration_number VARCHAR(100),
    gst_number VARCHAR(20),
    pan_number VARCHAR(10),

    -- Contact Information
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(10),
    country VARCHAR(100) DEFAULT 'India',
    phone VARCHAR(20),
    email VARCHAR(100),
    website VARCHAR(255),

    -- Branding
    logo_url VARCHAR(500),

    -- Settings (JSON for flexibility)
    settings JSON,

    -- Status
    status ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED') DEFAULT 'ACTIVE',

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- Indexes
    INDEX idx_company_code (company_code),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================
-- 2. ADD COMPANY_ID TO SITES TABLE
-- ==============================================
ALTER TABLE sites
ADD COLUMN company_id INT NULL AFTER site_id,
ADD INDEX idx_company_id (company_id),
ADD CONSTRAINT fk_sites_company
    FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE;

-- ==============================================
-- 3. ADD COMPANY_ID TO EMPLOYEES TABLE
-- ==============================================
ALTER TABLE employees
ADD COLUMN company_id INT NULL AFTER employee_id,
ADD INDEX idx_emp_company_id (company_id),
ADD CONSTRAINT fk_employees_company
    FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE;

-- ==============================================
-- 4. ADD COMPANY_ID TO USERS TABLE
-- Update role enum to include SUPER_ADMIN
-- ==============================================
ALTER TABLE users
ADD COLUMN company_id INT NULL AFTER user_id,
ADD INDEX idx_user_company_id (company_id),
ADD CONSTRAINT fk_users_company
    FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE;

-- Update role enum to include SUPER_ADMIN
ALTER TABLE users
MODIFY COLUMN role ENUM('SUPER_ADMIN', 'ADMIN', 'HR', 'MANAGER', 'EMPLOYEE') DEFAULT 'EMPLOYEE';

-- ==============================================
-- 5. ADD COMPANY_ID TO SALARIES TABLE
-- ==============================================
ALTER TABLE salaries
ADD COLUMN company_id INT NULL AFTER salary_id,
ADD INDEX idx_sal_company_id (company_id),
ADD CONSTRAINT fk_salaries_company
    FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE;

-- ==============================================
-- 6. ADD COMPANY_ID TO PAYSLIPS TABLE
-- ==============================================
ALTER TABLE payslips
ADD COLUMN company_id INT NULL AFTER payslip_id,
ADD INDEX idx_pay_company_id (company_id),
ADD CONSTRAINT fk_payslips_company
    FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE;

-- ==============================================
-- 7. ADD COMPANY_ID TO ATTENDANCE TABLE
-- ==============================================
ALTER TABLE attendance
ADD COLUMN company_id INT NULL AFTER attendance_id,
ADD INDEX idx_att_company_id (company_id),
ADD CONSTRAINT fk_attendance_company
    FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE;

-- ==============================================
-- 8. ADD COMPANY_ID TO AUDIT_LOGS TABLE
-- ==============================================
ALTER TABLE audit_logs
ADD COLUMN company_id INT NULL AFTER log_id,
ADD INDEX idx_log_company_id (company_id),
ADD CONSTRAINT fk_audit_logs_company
    FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE SET NULL;

-- ==============================================
-- 9. INSERT DEFAULT COMPANY (for existing data)
-- ==============================================
INSERT INTO companies (company_code, company_name, status)
VALUES ('DEFAULT', 'Default Company', 'ACTIVE');

-- Get the default company ID
SET @default_company_id = LAST_INSERT_ID();

-- ==============================================
-- 10. UPDATE EXISTING DATA WITH DEFAULT COMPANY
-- ==============================================
UPDATE sites SET company_id = @default_company_id WHERE company_id IS NULL;
UPDATE employees SET company_id = @default_company_id WHERE company_id IS NULL;
UPDATE users SET company_id = @default_company_id WHERE company_id IS NULL;
UPDATE salaries SET company_id = @default_company_id WHERE company_id IS NULL;
UPDATE payslips SET company_id = @default_company_id WHERE company_id IS NULL;
UPDATE attendance SET company_id = @default_company_id WHERE company_id IS NULL;
UPDATE audit_logs SET company_id = @default_company_id WHERE company_id IS NULL;

-- ==============================================
-- 11. MAKE COMPANY_ID NOT NULL (after data migration)
-- ==============================================
-- Note: Run these after confirming data migration is complete
-- ALTER TABLE sites MODIFY COLUMN company_id INT NOT NULL;
-- ALTER TABLE employees MODIFY COLUMN company_id INT NOT NULL;
-- ALTER TABLE users MODIFY COLUMN company_id INT NOT NULL;
-- ALTER TABLE salaries MODIFY COLUMN company_id INT NOT NULL;
-- ALTER TABLE payslips MODIFY COLUMN company_id INT NOT NULL;
-- ALTER TABLE attendance MODIFY COLUMN company_id INT NOT NULL;

-- ==============================================
-- 12. CREATE SUPER ADMIN USER (no company restriction)
-- ==============================================
-- Password: SuperAdmin@123 (change in production!)
INSERT INTO users (username, email, password_hash, role, company_id, status)
VALUES (
    'superadmin',
    'superadmin@hrms.com',
    '$2a$10$rQZ5Q5Q5Q5Q5Q5Q5Q5Q5Q.5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q', -- Placeholder, will be set by backend
    'SUPER_ADMIN',
    NULL, -- Super admin has no company restriction
    'ACTIVE'
);
