-- ==============================================
-- 017: Add RESIGNED to employees.status + backfill
-- ==============================================
-- The UI, dashboard and reports all use status = 'RESIGNED', but the original
-- schema enum (001) only had ACTIVE/INACTIVE/ON_LEAVE/TERMINATED. The live DB
-- was patched by hand; this migration codifies that so fresh/staging builds
-- match production. Idempotent: re-asserting the same enum is a safe no-op.

ALTER TABLE employees
  MODIFY COLUMN status
  ENUM('ACTIVE', 'INACTIVE', 'ON_LEAVE', 'TERMINATED', 'RESIGNED')
  DEFAULT 'ACTIVE';

-- The only writer of INACTIVE was the "mark as resigned" delete action, which
-- mislabeled resignations (they never showed in the Resigned report/tile).
-- Convert those legacy rows to RESIGNED. Idempotent: no INACTIVE rows remain
-- after the first run.
UPDATE employees SET status = 'RESIGNED' WHERE status = 'INACTIVE';

SELECT 'Migration 017: RESIGNED status added and INACTIVE employees backfilled' AS Status;
