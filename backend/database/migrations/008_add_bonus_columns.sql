-- Migration: Add bonus columns to payslips table
-- Payment of Bonus Act 1965: 8.33% of min(earned basic, 7000) for employees with basic <= 21000

-- Add bonus column (will fail silently if already exists when run via procedure)
-- Using stored procedure to check if column exists before adding

DELIMITER //

DROP PROCEDURE IF EXISTS AddBonusColumns//

CREATE PROCEDURE AddBonusColumns()
BEGIN
    -- Add bonus column if not exists
    IF NOT EXISTS (
        SELECT * FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'payslips'
        AND COLUMN_NAME = 'bonus'
    ) THEN
        ALTER TABLE payslips ADD COLUMN bonus DECIMAL(10, 2) DEFAULT 0;
    END IF;

    -- Add net_payable_with_bonus column if not exists
    IF NOT EXISTS (
        SELECT * FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'payslips'
        AND COLUMN_NAME = 'net_payable_with_bonus'
    ) THEN
        ALTER TABLE payslips ADD COLUMN net_payable_with_bonus DECIMAL(10, 2) DEFAULT 0;
    END IF;
END//

DELIMITER ;

-- Run the procedure
CALL AddBonusColumns();

-- Drop the procedure (cleanup)
DROP PROCEDURE IF EXISTS AddBonusColumns;

-- Update existing records to calculate net_payable_with_bonus
UPDATE payslips SET net_payable_with_bonus = net_salary + COALESCE(bonus, 0) WHERE net_payable_with_bonus = 0 OR net_payable_with_bonus IS NULL;
