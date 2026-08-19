-- ==============================================
-- 021: Notice period on the employee record
-- ==============================================
-- Notice period was only captured on the candidate. Carry it onto the employee
-- so exit processing (notice-shortfall recovery) has a per-employee value.
-- Backfills from the linked candidate where one exists; others default to 15.

ALTER TABLE employees
  ADD COLUMN notice_period INT DEFAULT 15 AFTER date_of_leaving;

-- Pull the notice period from the candidate the employee was converted from.
UPDATE employees e
  JOIN candidates c ON c.converted_employee_id = e.employee_id
  SET e.notice_period = c.notice_period
  WHERE c.notice_period IS NOT NULL;

SELECT 'Migration 021: employees.notice_period added and backfilled' AS Status;
