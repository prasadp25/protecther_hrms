-- ==============================================
-- Candidates Module Migration
-- For tracking pre-joining candidates and offer letters
-- ==============================================

USE hrms_db;

-- ==============================================
-- 1. CREATE CANDIDATES TABLE
-- ==============================================
CREATE TABLE IF NOT EXISTS candidates (
    candidate_id INT AUTO_INCREMENT PRIMARY KEY,
    candidate_code VARCHAR(50) UNIQUE NOT NULL,      -- C0001, C0002...
    company_id INT NOT NULL,
    
    -- Personal Information
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    gender ENUM('Male', 'Female', 'Other') NOT NULL,
    mobile VARCHAR(15) NOT NULL,
    email VARCHAR(100),
    dob DATE,
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(10),
    
    -- Government IDs (optional at candidate stage)
    aadhaar_no VARCHAR(12),
    pan_no VARCHAR(10),
    
    -- Position Details
    designation VARCHAR(100) NOT NULL,
    department VARCHAR(100) NOT NULL,
    site_id INT,
    expected_joining_date DATE,
    reporting_manager VARCHAR(100),
    
    -- Salary Structure (for offer letter)
    ctc DECIMAL(12, 2),
    basic_salary DECIMAL(10, 2),
    hra DECIMAL(10, 2) DEFAULT 0,
    conveyance_allowance DECIMAL(10, 2) DEFAULT 0,
    other_allowances DECIMAL(10, 2) DEFAULT 0,
    gross_salary DECIMAL(10, 2),
    
    -- Deductions
    pf_deduction DECIMAL(10, 2) DEFAULT 1800,
    pt_deduction DECIMAL(10, 2) DEFAULT 200,
    mediclaim_deduction DECIMAL(10, 2) DEFAULT 0,
    total_deductions DECIMAL(10, 2) DEFAULT 0,
    net_salary DECIMAL(10, 2),
    
    -- Offer Letter Details
    offer_letter_ref VARCHAR(50) UNIQUE,              -- PLLP-2026-101
    offer_letter_date DATE,
    offer_letter_url VARCHAR(500),                    -- Stored PDF path
    probation_period INT DEFAULT 6,                   -- Months
    notice_period INT DEFAULT 15,                     -- Days
    
    -- Status Tracking
    status ENUM('PENDING', 'OFFERED', 'ACCEPTED', 'REJECTED', 'NEGOTIATING', 'CONVERTED') DEFAULT 'PENDING',
    
    -- Conversion to Employee
    converted_employee_id INT,                        -- Links to employee after conversion
    converted_at TIMESTAMP NULL,
    
    -- Notes
    remarks TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE,
    FOREIGN KEY (site_id) REFERENCES sites(site_id) ON DELETE SET NULL,
    FOREIGN KEY (converted_employee_id) REFERENCES employees(employee_id) ON DELETE SET NULL,
    
    -- Indexes
    INDEX idx_candidate_code (candidate_code),
    INDEX idx_status (status),
    INDEX idx_company_id (company_id),
    INDEX idx_offer_letter_ref (offer_letter_ref),
    INDEX idx_site_id (site_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================
-- 2. CREATE OFFER LETTER SEQUENCE TABLE
-- For tracking offer letter numbers per year
-- ==============================================
CREATE TABLE IF NOT EXISTS offer_letter_sequence (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    year INT NOT NULL,                               -- e.g., 2026
    last_number INT DEFAULT 100,                     -- Starts from 100, so first is 101
    
    UNIQUE KEY unique_company_year (company_id, year),
    FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
