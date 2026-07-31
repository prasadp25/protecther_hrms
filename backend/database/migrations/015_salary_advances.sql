-- ============================================
-- SALARY ADVANCES
-- ============================================
-- Tracks advances given to employees and their recovery from payslips.
--   salary_advances           - one row per advance given (amount + how much
--                               to recover per month). Outstanding balance is
--                               DERIVED as amount - SUM(recoveries), never
--                               stored, so it stays correct automatically.
--   salary_advance_recoveries - ledger of how much was recovered on each
--                               payslip, keyed by payslip. When a payslip is
--                               deleted (regeneration), its recovery rows
--                               cascade-delete and the balance self-restores,
--                               so no double-recovery is possible.

CREATE TABLE IF NOT EXISTS salary_advances (
  advance_id       INT AUTO_INCREMENT PRIMARY KEY,
  company_id       INT NOT NULL,
  employee_id      INT NOT NULL,
  amount           DECIMAL(10,2) NOT NULL,          -- total advance given
  monthly_recovery DECIMAL(10,2) NOT NULL,          -- recover this much per payslip
  reason           VARCHAR(255),
  advance_date     DATE NOT NULL,
  -- ACTIVE = still being recovered; CANCELLED = remaining balance waived.
  -- "Fully recovered" is derived (balance = 0), not a separate status.
  status           ENUM('ACTIVE','CANCELLED') NOT NULL DEFAULT 'ACTIVE',
  created_by       INT,
  created_at       TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_advance_employee FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE,
  CONSTRAINT chk_advance_amount_positive CHECK (amount > 0),
  CONSTRAINT chk_advance_monthly_positive CHECK (monthly_recovery > 0 AND monthly_recovery <= amount),
  KEY idx_advance_employee (employee_id),
  KEY idx_advance_company (company_id),
  KEY idx_advance_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS salary_advance_recoveries (
  recovery_id  INT AUTO_INCREMENT PRIMARY KEY,
  advance_id   INT NOT NULL,
  payslip_id   INT NOT NULL,
  month        VARCHAR(7) NOT NULL,                 -- YYYY-MM (reporting)
  amount       DECIMAL(10,2) NOT NULL,
  created_at   TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_recovery_advance FOREIGN KEY (advance_id) REFERENCES salary_advances(advance_id) ON DELETE CASCADE,
  CONSTRAINT fk_recovery_payslip FOREIGN KEY (payslip_id) REFERENCES payslips(payslip_id) ON DELETE CASCADE,
  -- one recovery per advance per payslip (idempotent); payslip FK cascade
  -- auto-reverses recoveries when a payslip is deleted for regeneration.
  UNIQUE KEY uniq_recovery_advance_payslip (advance_id, payslip_id),
  KEY idx_recovery_advance (advance_id),
  KEY idx_recovery_payslip (payslip_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SELECT 'salary_advances tables created' AS status;
