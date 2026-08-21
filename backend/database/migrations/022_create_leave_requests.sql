-- ==============================================
-- 022: Leave application (simple, unpaid) — Phase 1
-- ==============================================
-- Employee applies -> HR approves/rejects. Approved leave is unpaid: its days
-- are surfaced on the monthly Attendance screen and reduce days_present, so the
-- existing payroll proration cuts the pay. No balances/quotas. Additive only.

CREATE TABLE IF NOT EXISTS leave_requests (
  leave_id      INT AUTO_INCREMENT PRIMARY KEY,
  employee_id   INT NOT NULL,
  company_id    INT NOT NULL,
  leave_type    ENUM('CASUAL', 'SICK', 'PERSONAL', 'OTHER') DEFAULT 'CASUAL', -- label only, all unpaid
  from_date     DATE NOT NULL,
  to_date       DATE NOT NULL,
  days          INT NOT NULL,          -- unpaid days, inclusive from..to count
  reason        TEXT,
  status        ENUM('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'WITHDRAWN') DEFAULT 'PENDING',
  submitted_by  ENUM('EMPLOYEE', 'HR') NOT NULL DEFAULT 'EMPLOYEE',
  decision_by   INT,
  decision_at   TIMESTAMP NULL,
  decision_note TEXT,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE,
  INDEX idx_leave_employee (employee_id),
  INDEX idx_leave_status (status),
  INDEX idx_leave_dates (from_date, to_date),
  INDEX idx_leave_company (company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SELECT 'Migration 022: leave_requests created' AS Status;
