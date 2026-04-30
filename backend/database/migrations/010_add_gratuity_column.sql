-- Migration: Add gratuity column to payslips table
-- Gratuity: 4.81% of Basic (as per Payment of Gratuity Act 1972)
-- Formula: (Basic × 15) / 26 / 12 = Basic × 4.81%

ALTER TABLE payslips
ADD COLUMN gratuity DECIMAL(10, 2) DEFAULT 0 AFTER bonus;

-- Add index for reporting
CREATE INDEX idx_payslips_gratuity ON payslips(gratuity);
