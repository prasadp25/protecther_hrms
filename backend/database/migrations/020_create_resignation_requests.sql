-- ==============================================
-- 020: Resignation approval workflow — Phase 1
-- ==============================================
-- Request -> approve -> relieve. The employee stays ACTIVE (on payroll/portal)
-- through the notice period; only the Relieve step flips employees.status to
-- RESIGNED. See RESIGNATION_WORKFLOW_SPECIFICATION.md. Additive only.

CREATE TABLE IF NOT EXISTS resignation_requests (
  request_id     INT AUTO_INCREMENT PRIMARY KEY,
  employee_id    INT NOT NULL,
  company_id     INT NOT NULL,
  submitted_by   ENUM('EMPLOYEE', 'HR') NOT NULL DEFAULT 'HR',
  reason         TEXT,
  requested_lwd  DATE NOT NULL,        -- intended last working day
  approved_lwd   DATE,                 -- agreed LWD, set on approval
  notice_days    INT,                  -- policy notice period snapshot
  status         ENUM('PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN', 'CANCELLED', 'RELIEVED')
                   DEFAULT 'PENDING',
  decision_by    INT,
  decision_at    TIMESTAMP NULL,
  decision_note  TEXT,
  relieved_by    INT,
  relieved_at    TIMESTAMP NULL,
  created_by     INT,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE,
  INDEX idx_resig_employee (employee_id),
  INDEX idx_resig_status (status),
  INDEX idx_resig_company (company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SELECT 'Migration 020: resignation_requests created' AS Status;
