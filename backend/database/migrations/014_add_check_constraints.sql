-- Migration: Add CHECK constraints for data integrity
-- Version: 014
-- Description: Add constraints for positive values on salaries, attendance, and payslips

-- Note: MySQL 8.0.16+ enforces CHECK constraints. Earlier versions parse but ignore them.

-- ============================================
-- SALARIES TABLE CONSTRAINTS
-- ============================================

-- Drop existing constraints if they exist (safe to run multiple times)
ALTER TABLE salaries DROP CONSTRAINT IF EXISTS chk_basic_salary_positive;
ALTER TABLE salaries DROP CONSTRAINT IF EXISTS chk_gross_salary_positive;
ALTER TABLE salaries DROP CONSTRAINT IF EXISTS chk_hra_non_negative;
ALTER TABLE salaries DROP CONSTRAINT IF EXISTS chk_pf_non_negative;
ALTER TABLE salaries DROP CONSTRAINT IF EXISTS chk_esi_non_negative;

-- Add CHECK constraints for salaries
ALTER TABLE salaries ADD CONSTRAINT chk_basic_salary_positive CHECK (basic_salary > 0);
ALTER TABLE salaries ADD CONSTRAINT chk_gross_salary_positive CHECK (gross_salary > 0);
ALTER TABLE salaries ADD CONSTRAINT chk_hra_non_negative CHECK (hra >= 0);
ALTER TABLE salaries ADD CONSTRAINT chk_pf_non_negative CHECK (pf_deduction >= 0);
ALTER TABLE salaries ADD CONSTRAINT chk_esi_non_negative CHECK (esi_deduction >= 0);

-- ============================================
-- ATTENDANCE TABLE CONSTRAINTS
-- ============================================

ALTER TABLE attendance DROP CONSTRAINT IF EXISTS chk_days_present_valid;
ALTER TABLE attendance DROP CONSTRAINT IF EXISTS chk_total_days_valid;

-- Add CHECK constraints for attendance
ALTER TABLE attendance ADD CONSTRAINT chk_days_present_valid CHECK (days_present >= 0 AND days_present <= 31);
ALTER TABLE attendance ADD CONSTRAINT chk_total_days_valid CHECK (total_days_in_month >= 28 AND total_days_in_month <= 31);

-- ============================================
-- PAYSLIPS TABLE CONSTRAINTS
-- ============================================

ALTER TABLE payslips DROP CONSTRAINT IF EXISTS chk_payslip_gross_positive;
ALTER TABLE payslips DROP CONSTRAINT IF EXISTS chk_payslip_days_present;
ALTER TABLE payslips DROP CONSTRAINT IF EXISTS chk_payslip_deductions;

-- Add CHECK constraints for payslips
ALTER TABLE payslips ADD CONSTRAINT chk_payslip_gross_positive CHECK (gross_salary >= 0);
ALTER TABLE payslips ADD CONSTRAINT chk_payslip_days_present CHECK (days_present >= 0 AND days_present <= 31);
ALTER TABLE payslips ADD CONSTRAINT chk_payslip_deductions CHECK (total_deductions >= 0);

-- ============================================
-- CANDIDATES TABLE CONSTRAINTS
-- ============================================

ALTER TABLE candidates DROP CONSTRAINT IF EXISTS chk_candidate_salary_positive;

-- Add CHECK constraint for candidate salary
ALTER TABLE candidates ADD CONSTRAINT chk_candidate_salary_positive CHECK (gross_salary > 0);

SELECT 'CHECK constraints added successfully' as status;
