-- Update Salary Structure for Fixed vs Actual Salary System
-- Date: 2025-11-04

USE hrms_db;

-- Add mediclaim deduction column if not exists
ALTER TABLE salaries
ADD COLUMN IF NOT EXISTS mediclaim_deduction DECIMAL(10, 2) DEFAULT 0 AFTER professional_tax;

-- Add advance deduction column if not exists
ALTER TABLE salaries
ADD COLUMN IF NOT EXISTS advance_deduction DECIMAL(10, 2) DEFAULT 0 AFTER mediclaim_deduction;

-- Rename other_allowances to incentive_allowance for clarity
ALTER TABLE salaries
CHANGE COLUMN other_allowances incentive_allowance DECIMAL(10, 2) DEFAULT 0;

-- Remove unused allowance columns (consolidating into incentive_allowance)
-- ALTER TABLE salaries DROP COLUMN IF EXISTS da;
-- ALTER TABLE salaries DROP COLUMN IF EXISTS conveyance_allowance;
-- ALTER TABLE salaries DROP COLUMN IF EXISTS medical_allowance;
-- ALTER TABLE salaries DROP COLUMN IF EXISTS special_allowance;

-- Update payslips table to store both fixed and actual salary
ALTER TABLE payslips
ADD COLUMN IF NOT EXISTS total_days_in_month INT DEFAULT 31 AFTER total_working_days;

-- Add mediclaim deduction to payslips
ALTER TABLE payslips
ADD COLUMN IF NOT EXISTS mediclaim_deduction DECIMAL(10, 2) DEFAULT 0 AFTER professional_tax;

-- Rename advance_deduction for consistency
ALTER TABLE payslips
CHANGE COLUMN IF EXISTS advance_deduction advance_deduction DECIMAL(10, 2) DEFAULT 0;

-- Add IFSC and Account number reference (already in employees table, just for payslip record)
-- These will be fetched from employees table when generating payslip

-- Add remark column to payslips if not exists
ALTER TABLE payslips
MODIFY COLUMN remarks TEXT;

COMMIT;
