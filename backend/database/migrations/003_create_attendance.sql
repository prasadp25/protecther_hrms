-- Attendance Management Migration
-- Run this in MySQL Workbench or phpMyAdmin

USE hrms_db;

-- Create attendance table
CREATE TABLE IF NOT EXISTS attendance (
    attendance_id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    attendance_month VARCHAR(7) NOT NULL COMMENT 'Format: YYYY-MM',
    days_present INT NOT NULL DEFAULT 0,
    total_days_in_month INT NOT NULL DEFAULT 30,
    remarks TEXT,
    status ENUM('DRAFT', 'FINALIZED') DEFAULT 'DRAFT',
    created_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- Foreign Keys
    FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE,

    -- Indexes
    INDEX idx_employee_month (employee_id, attendance_month),
    INDEX idx_month (attendance_month),
    INDEX idx_status (status),

    -- Unique constraint: one attendance record per employee per month
    UNIQUE KEY unique_employee_month (employee_id, attendance_month)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Verify
SELECT 'Attendance table created successfully!' AS Status;
SHOW COLUMNS FROM attendance;
