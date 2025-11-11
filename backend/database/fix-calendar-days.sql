-- Fix Calendar Days in Payslips
-- This script updates total_working_days to use actual calendar days (total_days_in_month)
-- for all existing payslip records

UPDATE payslips
SET total_working_days = total_days_in_month
WHERE total_days_in_month IS NOT NULL
  AND total_days_in_month > 0;

-- Verify the update
SELECT
    payslip_id,
    employee_code,
    month,
    days_present,
    total_working_days,
    total_days_in_month,
    CONCAT(days_present, ' / ', total_working_days) as display
FROM payslips
ORDER BY month DESC, employee_code;
