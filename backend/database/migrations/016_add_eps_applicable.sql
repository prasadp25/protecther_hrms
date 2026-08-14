-- 016_add_eps_applicable.sql
-- EPS (Employees' Pension Scheme) membership flag for ECR generation.
-- Some members are excluded from EPS per EPFO records (e.g. first joined EPF
-- on/after 01-Sep-2014 with wages > 15,000, or over 58). For them the ECR must
-- show EPS wages = 0, EPS contribution = 0, and the full employer 12% under EPF.
-- Default 1 = normal EPS member. HR sets 0 for EPFO-flagged exempt members.

ALTER TABLE employees
  ADD COLUMN eps_applicable TINYINT(1) NOT NULL DEFAULT 1
  COMMENT 'EPS pension-scheme member (1=yes). 0 = EPS-exempt per EPFO; ECR zeroes EPS.'
  AFTER pf_no;
