-- Add entry mode tracking for backward calculation feature
-- Date: 2025-11-21

USE hrms_db;

-- Add entry_mode to track how salary was entered (backward = CTC-based, manual = component-based)
ALTER TABLE salaries
ADD COLUMN IF NOT EXISTS entry_mode ENUM('backward', 'manual') DEFAULT 'manual' AFTER effective_to;

-- Add split_type to store the percentage split used
ALTER TABLE salaries
ADD COLUMN IF NOT EXISTS split_type VARCHAR(20) DEFAULT '40-20-40' AFTER entry_mode;

-- Add pt_state to store which state's PT rules were used
ALTER TABLE salaries
ADD COLUMN IF NOT EXISTS pt_state VARCHAR(50) DEFAULT 'maharashtra' AFTER split_type;

COMMIT;
