-- Migration: Employee Self-Service Portal
-- Description: Adds support for employee portal with OTP login, notices, and company settings

-- ==============================================
-- 1. Add photo_url to employees
-- ==============================================
ALTER TABLE employees ADD COLUMN photo_url VARCHAR(500) NULL AFTER email;

-- ==============================================
-- 2. Create OTP tokens table
-- ==============================================
CREATE TABLE otp_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    email VARCHAR(100) NOT NULL,
    otp_code VARCHAR(6) NOT NULL,
    expires_at DATETIME NOT NULL,
    attempts INT DEFAULT 0,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE,
    INDEX idx_email_otp (email, otp_code),
    INDEX idx_expires (expires_at)
);

-- ==============================================
-- 3. Create notices table
-- ==============================================
CREATE TABLE notices (
    notice_id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    category ENUM('GENERAL', 'POLICY', 'HOLIDAY', 'URGENT') DEFAULT 'GENERAL',
    is_active BOOLEAN DEFAULT TRUE,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(user_id),
    INDEX idx_company_active (company_id, is_active)
);

-- ==============================================
-- 4. Create company settings table (for insurance config)
-- ==============================================
CREATE TABLE company_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL UNIQUE,
    insurance_provider VARCHAR(100) DEFAULT 'Bhima Kavach',
    hospital_list_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE
);

-- ==============================================
-- 5. Cleanup procedure for expired OTPs (optional scheduled job)
-- ==============================================
-- Run this periodically to clean up expired OTPs:
-- DELETE FROM otp_tokens WHERE expires_at < NOW() OR used = TRUE;
