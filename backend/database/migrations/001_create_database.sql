-- HRMS Database Schema
-- Create Database

CREATE DATABASE IF NOT EXISTS hrms_db
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE hrms_db;

-- ==============================================
-- 1. SITES/CLIENTS TABLE
-- ==============================================
CREATE TABLE IF NOT EXISTS sites (
    site_id INT AUTO_INCREMENT PRIMARY KEY,
    site_code VARCHAR(50) UNIQUE NOT NULL,
    site_name VARCHAR(255) NOT NULL,
    client_name VARCHAR(255),
    location VARCHAR(255),
    site_address TEXT,
    contact_person VARCHAR(100),
    contact_mobile VARCHAR(15),
    contact_email VARCHAR(100),
    start_date DATE,
    end_date DATE,
    status ENUM('ACTIVE', 'INACTIVE', 'COMPLETED') DEFAULT 'ACTIVE',
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_site_code (site_code),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================
-- 2. EMPLOYEES TABLE
-- ==============================================
CREATE TABLE IF NOT EXISTS employees (
    employee_id INT AUTO_INCREMENT PRIMARY KEY,
    employee_code VARCHAR(50) UNIQUE NOT NULL,

    -- Personal Information
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    mobile VARCHAR(15) NOT NULL,
    alternate_mobile VARCHAR(15),
    email VARCHAR(100),
    dob DATE NOT NULL,
    gender ENUM('Male', 'Female', 'Other') NOT NULL,
    marital_status ENUM('Single', 'Married', 'Divorced', 'Widowed'),
    qualification VARCHAR(100),
    address TEXT NOT NULL,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(10),

    -- Government IDs
    aadhaar_no VARCHAR(12) UNIQUE NOT NULL,
    aadhaar_card_url VARCHAR(500),
    pan_no VARCHAR(10) UNIQUE NOT NULL,
    pan_card_url VARCHAR(500),

    -- PF & ESI
    uan_no VARCHAR(20),
    pf_no VARCHAR(50),
    esi_no VARCHAR(20),

    -- Bank Details
    account_number VARCHAR(50),
    ifsc_code VARCHAR(20),
    bank_name VARCHAR(100),
    branch_name VARCHAR(100),

    -- Employment Details
    designation VARCHAR(100) NOT NULL,
    department VARCHAR(100) NOT NULL,
    date_of_joining DATE NOT NULL,
    date_of_leaving DATE,
    offer_letter_issue_date DATE NOT NULL,
    offer_letter_url VARCHAR(500),
    status ENUM('ACTIVE', 'INACTIVE', 'ON_LEAVE', 'TERMINATED') DEFAULT 'ACTIVE',

    -- Site Assignment
    site_id INT,

    -- Emergency Contact
    emergency_contact_name VARCHAR(100) NOT NULL,
    emergency_contact_mobile VARCHAR(15) NOT NULL,
    emergency_contact_relationship VARCHAR(50) NOT NULL,

    -- Insurance & Benefits
    wp_policy ENUM('Yes', 'No') DEFAULT 'No',
    hospital_insurance_id VARCHAR(15),

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- Foreign Keys
    FOREIGN KEY (site_id) REFERENCES sites(site_id) ON DELETE SET NULL,

    -- Indexes
    INDEX idx_employee_code (employee_code),
    INDEX idx_status (status),
    INDEX idx_site_id (site_id),
    INDEX idx_designation (designation),
    INDEX idx_department (department),
    INDEX idx_date_of_joining (date_of_joining)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================
-- 3. SALARIES TABLE
-- ==============================================
CREATE TABLE IF NOT EXISTS salaries (
    salary_id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,

    -- Salary Components
    basic_salary DECIMAL(10, 2) NOT NULL,
    hra DECIMAL(10, 2) DEFAULT 0,
    da DECIMAL(10, 2) DEFAULT 0,
    conveyance_allowance DECIMAL(10, 2) DEFAULT 0,
    medical_allowance DECIMAL(10, 2) DEFAULT 0,
    special_allowance DECIMAL(10, 2) DEFAULT 0,
    other_allowances DECIMAL(10, 2) DEFAULT 0,

    -- Calculated Fields
    gross_salary DECIMAL(10, 2) NOT NULL,

    -- Deductions
    pf_deduction DECIMAL(10, 2) DEFAULT 0,
    esi_deduction DECIMAL(10, 2) DEFAULT 0,
    professional_tax DECIMAL(10, 2) DEFAULT 0,
    tds DECIMAL(10, 2) DEFAULT 0,
    other_deductions DECIMAL(10, 2) DEFAULT 0,
    total_deductions DECIMAL(10, 2) DEFAULT 0,

    -- Net Salary
    net_salary DECIMAL(10, 2) NOT NULL,

    -- Validity
    effective_from DATE NOT NULL,
    effective_to DATE,
    status ENUM('ACTIVE', 'INACTIVE', 'REVISED') DEFAULT 'ACTIVE',

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- Foreign Keys
    FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE,

    -- Indexes
    INDEX idx_employee_id (employee_id),
    INDEX idx_status (status),
    INDEX idx_effective_from (effective_from)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================
-- 4. PAYSLIPS TABLE
-- ==============================================
CREATE TABLE IF NOT EXISTS payslips (
    payslip_id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    salary_id INT NOT NULL,

    -- Month Information
    month VARCHAR(7) NOT NULL, -- Format: YYYY-MM
    total_working_days INT NOT NULL,
    days_present INT NOT NULL,
    days_absent INT NOT NULL,
    paid_leaves INT DEFAULT 0,
    unpaid_leaves INT DEFAULT 0,
    overtime DECIMAL(5, 2) DEFAULT 0,

    -- Earnings (Calculated based on attendance)
    basic_salary DECIMAL(10, 2) NOT NULL,
    hra DECIMAL(10, 2) DEFAULT 0,
    other_allowances DECIMAL(10, 2) DEFAULT 0,
    overtime_amount DECIMAL(10, 2) DEFAULT 0,
    gross_salary DECIMAL(10, 2) NOT NULL,

    -- Deductions
    pf_deduction DECIMAL(10, 2) DEFAULT 0,
    esi_deduction DECIMAL(10, 2) DEFAULT 0,
    professional_tax DECIMAL(10, 2) DEFAULT 0,
    tds DECIMAL(10, 2) DEFAULT 0,
    advance_deduction DECIMAL(10, 2) DEFAULT 0,
    welfare_deduction DECIMAL(10, 2) DEFAULT 0,
    health_insurance DECIMAL(10, 2) DEFAULT 0,
    other_deductions DECIMAL(10, 2) DEFAULT 0,
    total_deductions DECIMAL(10, 2) DEFAULT 0,

    -- Net Salary
    net_salary DECIMAL(10, 2) NOT NULL,

    -- Payment Information
    payment_status ENUM('PENDING', 'PAID', 'CANCELLED') DEFAULT 'PENDING',
    payment_method ENUM('CASH', 'BANK_TRANSFER', 'CHEQUE', 'UPI') DEFAULT 'BANK_TRANSFER',
    payment_date DATE,
    payment_reference VARCHAR(100),

    -- Additional Information
    remarks TEXT,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- Foreign Keys
    FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE,
    FOREIGN KEY (salary_id) REFERENCES salaries(salary_id) ON DELETE CASCADE,

    -- Indexes
    INDEX idx_employee_id (employee_id),
    INDEX idx_month (month),
    INDEX idx_payment_status (payment_status),

    -- Unique constraint: One payslip per employee per month
    UNIQUE KEY unique_employee_month (employee_id, month)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================
-- 5. ATTENDANCE TABLE
-- ==============================================
CREATE TABLE IF NOT EXISTS attendance (
    attendance_id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,

    -- Attendance Date
    attendance_date DATE NOT NULL,

    -- Time Information
    check_in_time TIME,
    check_out_time TIME,

    -- Status
    status ENUM('PRESENT', 'ABSENT', 'HALF_DAY', 'ON_LEAVE', 'HOLIDAY', 'WEEK_OFF') NOT NULL,
    leave_type ENUM('PAID', 'UNPAID', 'SICK', 'CASUAL', 'EARNED') NULL,

    -- Overtime
    overtime_hours DECIMAL(5, 2) DEFAULT 0,

    -- Location
    site_id INT,

    -- Approval
    approved_by INT,
    approved_at TIMESTAMP NULL,

    -- Remarks
    remarks TEXT,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- Foreign Keys
    FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE,
    FOREIGN KEY (site_id) REFERENCES sites(site_id) ON DELETE SET NULL,

    -- Indexes
    INDEX idx_employee_id (employee_id),
    INDEX idx_attendance_date (attendance_date),
    INDEX idx_status (status),
    INDEX idx_site_id (site_id),

    -- Unique constraint: One attendance record per employee per day
    UNIQUE KEY unique_employee_date (employee_id, attendance_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================
-- 6. USERS TABLE (For Authentication)
-- ==============================================
CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,

    -- Role
    role ENUM('ADMIN', 'HR', 'MANAGER', 'EMPLOYEE') DEFAULT 'EMPLOYEE',

    -- Employee Link (optional)
    employee_id INT NULL,

    -- Status
    status ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED') DEFAULT 'ACTIVE',

    -- Last Login
    last_login TIMESTAMP NULL,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- Foreign Keys
    FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE SET NULL,

    -- Indexes
    INDEX idx_username (username),
    INDEX idx_email (email),
    INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================
-- 7. AUDIT LOG TABLE (Optional but recommended)
-- ==============================================
CREATE TABLE IF NOT EXISTS audit_logs (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(50),
    record_id INT,
    old_value TEXT,
    new_value TEXT,
    ip_address VARCHAR(45),
    user_agent VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Foreign Keys
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL,

    -- Indexes
    INDEX idx_user_id (user_id),
    INDEX idx_table_name (table_name),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
