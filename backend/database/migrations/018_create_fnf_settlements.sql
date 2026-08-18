-- ==============================================
-- 018: Full & Final (F&F) Settlement — Phase 1
-- ==============================================
-- Header + typed line items. See FNF_SETTLEMENT_SPECIFICATION.md.
-- Additive only: no existing table is touched.

CREATE TABLE IF NOT EXISTS fnf_settlements (
  fnf_id            INT AUTO_INCREMENT PRIMARY KEY,
  employee_id       INT NOT NULL,
  company_id        INT NOT NULL,
  separation_type   ENUM('RESIGNED', 'TERMINATED') NOT NULL,
  last_working_day  DATE NOT NULL,
  settlement_month  VARCHAR(7) NOT NULL,      -- YYYY-MM of final salary

  -- Snapshots taken at creation so later salary edits never rewrite history
  last_basic             DECIMAL(10, 2) DEFAULT 0,
  completed_years        DECIMAL(5, 2)  DEFAULT 0,
  total_earnings         DECIMAL(12, 2) DEFAULT 0,
  total_recoveries       DECIMAL(12, 2) DEFAULT 0,
  net_payable            DECIMAL(12, 2) DEFAULT 0,   -- signed value, negative = recoverable

  -- Reference-only figures (never part of net_payable — gratuity/bonus are
  -- already paid monthly in this client's folded-CTC model)
  ref_accrued_gratuity   DECIMAL(12, 2) DEFAULT 0,
  ref_statutory_gratuity DECIMAL(12, 2) DEFAULT 0,

  status            ENUM('DRAFT', 'APPROVED', 'PAID', 'CANCELLED') DEFAULT 'DRAFT',
  remarks           TEXT,
  created_by        INT,
  approved_by       INT,
  approved_at       TIMESTAMP NULL,
  paid_at           TIMESTAMP NULL,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE,
  INDEX idx_fnf_employee (employee_id),
  INDEX idx_fnf_status (status),
  INDEX idx_fnf_company (company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS fnf_line_items (
  item_id     INT AUTO_INCREMENT PRIMARY KEY,
  fnf_id      INT NOT NULL,
  kind        ENUM('EARNING', 'RECOVERY') NOT NULL,
  code        VARCHAR(40) NOT NULL,     -- FINAL_SALARY, LEAVE_ENCASH, ADVANCE, NOTICE, OTHER, ...
  label       VARCHAR(120) NOT NULL,
  amount      DECIMAL(12, 2) NOT NULL DEFAULT 0,
  is_auto     BOOLEAN DEFAULT FALSE,    -- system-computed vs HR-entered
  source_ref  VARCHAR(60),              -- e.g. advance_id / payslip_id
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (fnf_id) REFERENCES fnf_settlements(fnf_id) ON DELETE CASCADE,
  INDEX idx_line_fnf (fnf_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SELECT 'Migration 018: F&F settlement tables created' AS Status;
