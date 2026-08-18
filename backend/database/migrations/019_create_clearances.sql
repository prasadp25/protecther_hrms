-- ==============================================
-- 019: No-dues / Clearance checklist — Phase 3b
-- ==============================================
-- Per-department exit clearance for a RESIGNED/TERMINATED employee.
-- Header rolls up to CLEARED when no item is still PENDING. Additive only.

CREATE TABLE IF NOT EXISTS employee_clearances (
  clearance_id  INT AUTO_INCREMENT PRIMARY KEY,
  employee_id   INT NOT NULL,
  company_id    INT NOT NULL,
  status        ENUM('PENDING', 'CLEARED', 'CANCELLED') DEFAULT 'PENDING',
  remarks       TEXT,
  created_by    INT,
  cleared_at    TIMESTAMP NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE,
  INDEX idx_clr_employee (employee_id),
  INDEX idx_clr_status (status),
  INDEX idx_clr_company (company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS clearance_items (
  item_id       INT AUTO_INCREMENT PRIMARY KEY,
  clearance_id  INT NOT NULL,
  label         VARCHAR(120) NOT NULL,    -- e.g. "IT / Systems — access & devices"
  status        ENUM('PENDING', 'CLEARED', 'NA') DEFAULT 'PENDING',
  remarks       VARCHAR(255),
  cleared_by    VARCHAR(120),             -- free-text: who signed it off
  sort_order    INT DEFAULT 0,
  cleared_at    TIMESTAMP NULL,
  FOREIGN KEY (clearance_id) REFERENCES employee_clearances(clearance_id) ON DELETE CASCADE,
  INDEX idx_item_clearance (clearance_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SELECT 'Migration 019: clearance tables created' AS Status;
