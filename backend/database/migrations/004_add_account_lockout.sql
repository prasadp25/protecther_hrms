-- ==============================================
-- MIGRATION: Add Account Lockout Fields
-- ==============================================
-- This migration adds fields to track failed login attempts
-- and implement account lockout functionality

USE hrms_db;

-- Add columns to users table for account lockout
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS failed_login_attempts INT DEFAULT 0 COMMENT 'Number of consecutive failed login attempts',
ADD COLUMN IF NOT EXISTS account_locked_until DATETIME NULL COMMENT 'Account locked until this timestamp',
ADD COLUMN IF NOT EXISTS last_failed_login DATETIME NULL COMMENT 'Timestamp of last failed login attempt';

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_users_account_locked ON users(account_locked_until);

-- Display success message
SELECT 'Account lockout fields added successfully' AS message;
