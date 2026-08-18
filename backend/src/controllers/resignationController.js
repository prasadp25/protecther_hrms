const { executeQuery, withTransaction } = require('../config/database');
const { asyncHandler, NotFoundError, ValidationError, ConflictError } = require('../utils/errors');
const { getCompanyFilter } = require('../middleware/auth');
const { logAudit } = require('../utils/auditLogger');

// ==============================================
// Resignation approval workflow — Phase 1 (HR side)
// PENDING -> APPROVED -> RELIEVED (+ REJECTED / WITHDRAWN / CANCELLED).
// The employee stays ACTIVE through the notice period; only Relieve flips
// employees.status to RESIGNED. See RESIGNATION_WORKFLOW_SPECIFICATION.md.
// ==============================================

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const nameExpr = `TRIM(CONCAT(e.first_name, ' ', COALESCE(e.last_name, '')))`;
const LIVE_STATUSES = ['PENDING', 'APPROVED'];

const loadEmployee = async (employeeId, req) => {
  const companyId = getCompanyFilter(req);
  const params = [employeeId];
  let q = `SELECT e.*, ${nameExpr} AS employee_name FROM employees e WHERE e.employee_id = ?`;
  if (companyId) { q += ' AND e.company_id = ?'; params.push(companyId); }
  const rows = await executeQuery(q, params);
  if (rows.length === 0) throw new NotFoundError('Employee not found');
  return rows[0];
};

const fetchRequestOr404 = async (requestId, req) => {
  const companyId = getCompanyFilter(req);
  const params = [requestId];
  let q = `SELECT r.*, e.employee_code, ${nameExpr} AS employee_name, e.designation, e.status AS employee_status
           FROM resignation_requests r
           JOIN employees e ON e.employee_id = r.employee_id
           WHERE r.request_id = ?`;
  if (companyId) { q += ' AND r.company_id = ?'; params.push(companyId); }
  const rows = await executeQuery(q, params);
  if (rows.length === 0) throw new NotFoundError('Resignation request not found');
  return rows[0];
};

// ==============================================
// POST /resignations/employees/:id  — HR raises on behalf
// ==============================================
const raiseRequest = asyncHandler(async (req, res) => {
  const employeeId = req.params.id;
  const employee = await loadEmployee(employeeId, req);
  if (employee.status !== 'ACTIVE' && employee.status !== 'ON_LEAVE') {
    throw new ValidationError('Only an ACTIVE employee can have a resignation raised');
  }
  const { reason, requested_lwd, notice_days } = req.body;
  if (!requested_lwd || !DATE_RE.test(requested_lwd)) {
    throw new ValidationError('requested_lwd (YYYY-MM-DD) is required');
  }

  const dup = await executeQuery(
    'SELECT request_id FROM resignation_requests WHERE employee_id = ? AND status IN (?, ?)',
    [employeeId, ...LIVE_STATUSES]
  );
  if (dup.length > 0) throw new ConflictError('A resignation request is already open for this employee');

  const result = await executeQuery(
    `INSERT INTO resignation_requests
       (employee_id, company_id, submitted_by, reason, requested_lwd, notice_days, status, created_by)
     VALUES (?, ?, 'HR', ?, ?, ?, 'PENDING', ?)`,
    [employeeId, employee.company_id, reason || null, requested_lwd,
     notice_days != null ? parseInt(notice_days) : null, req.user.user_id || null]
  );

  await logAudit({ tableName: 'resignation_requests', recordId: result.insertId, action: 'CREATE', req,
    newValues: { employee_id: employeeId, requested_lwd, status: 'PENDING' } });

  const request = await fetchRequestOr404(result.insertId, req);
  res.status(201).json({ success: true, message: 'Resignation request raised', data: request });
});

// ==============================================
// GET /resignations  — list (?status=, ?due=1)
// ==============================================
const listRequests = asyncHandler(async (req, res) => {
  const companyId = getCompanyFilter(req);
  const params = [];
  let q = `SELECT r.request_id, r.employee_id, e.employee_code, ${nameExpr} AS employee_name,
                  e.designation, r.submitted_by, r.requested_lwd, r.approved_lwd, r.notice_days,
                  r.status, r.created_at, r.decision_at,
                  (r.status = 'APPROVED' AND r.approved_lwd <= CURDATE()) AS due_to_relieve
           FROM resignation_requests r
           JOIN employees e ON e.employee_id = r.employee_id
           WHERE 1=1`;
  if (companyId) { q += ' AND r.company_id = ?'; params.push(companyId); }
  if (req.query.status) { q += ' AND r.status = ?'; params.push(req.query.status); }
  if (req.query.due === '1') { q += " AND r.status = 'APPROVED' AND r.approved_lwd <= CURDATE()"; }
  q += ' ORDER BY r.created_at DESC';
  const rows = await executeQuery(q, params);
  res.json({ success: true, data: rows });
});

// ==============================================
// GET /resignations/:id
// ==============================================
const getRequest = asyncHandler(async (req, res) => {
  const request = await fetchRequestOr404(req.params.id, req);
  res.json({ success: true, data: request });
});

// ==============================================
// POST /resignations/:id/approve
// ==============================================
const approveRequest = asyncHandler(async (req, res) => {
  const request = await fetchRequestOr404(req.params.id, req);
  if (request.status !== 'PENDING') {
    throw new ValidationError(`Only a PENDING request can be approved (this one is ${request.status})`);
  }
  const approvedLwd = (req.body.approved_lwd && DATE_RE.test(req.body.approved_lwd))
    ? req.body.approved_lwd
    : String(request.requested_lwd).slice(0, 10);

  await executeQuery(
    `UPDATE resignation_requests
       SET status = 'APPROVED', approved_lwd = ?, decision_by = ?, decision_at = NOW(), decision_note = ?
     WHERE request_id = ?`,
    [approvedLwd, req.user.user_id || null, req.body.note || null, request.request_id]
  );
  await logAudit({ tableName: 'resignation_requests', recordId: request.request_id, action: 'APPROVED', req,
    oldValues: { status: 'PENDING' }, newValues: { status: 'APPROVED', approved_lwd: approvedLwd } });

  const updated = await fetchRequestOr404(request.request_id, req);
  res.json({ success: true, message: 'Resignation approved', data: updated });
});

// ==============================================
// POST /resignations/:id/reject
// ==============================================
const rejectRequest = asyncHandler(async (req, res) => {
  const request = await fetchRequestOr404(req.params.id, req);
  if (request.status !== 'PENDING') {
    throw new ValidationError(`Only a PENDING request can be rejected (this one is ${request.status})`);
  }
  await executeQuery(
    `UPDATE resignation_requests SET status = 'REJECTED', decision_by = ?, decision_at = NOW(), decision_note = ?
     WHERE request_id = ?`,
    [req.user.user_id || null, req.body.note || null, request.request_id]
  );
  await logAudit({ tableName: 'resignation_requests', recordId: request.request_id, action: 'REJECTED', req,
    oldValues: { status: 'PENDING' }, newValues: { status: 'REJECTED' } });
  const updated = await fetchRequestOr404(request.request_id, req);
  res.json({ success: true, message: 'Resignation rejected', data: updated });
});

// ==============================================
// POST /resignations/:id/relieve
// Flips the employee to RESIGNED @ approved LWD (same effects as deleteEmployee:
// employee status + date_of_leaving + salary deactivation), in one transaction.
// ==============================================
const relieveRequest = asyncHandler(async (req, res) => {
  const request = await fetchRequestOr404(req.params.id, req);
  if (request.status !== 'APPROVED') {
    throw new ValidationError(`Only an APPROVED request can be relieved (this one is ${request.status})`);
  }
  const lwd = String(request.approved_lwd).slice(0, 10);

  await withTransaction(async (conn) => {
    await conn.query(
      'UPDATE employees SET status = ?, date_of_leaving = ? WHERE employee_id = ?',
      ['RESIGNED', lwd, request.employee_id]
    );
    await conn.query('UPDATE salaries SET status = ? WHERE employee_id = ?', ['INACTIVE', request.employee_id]);
    await conn.query(
      `UPDATE resignation_requests SET status = 'RELIEVED', relieved_by = ?, relieved_at = NOW()
       WHERE request_id = ?`,
      [req.user.user_id || null, request.request_id]
    );
  });

  // Flag any advance still owed (as deleteEmployee does) so it can be collected
  // in the F&F settlement.
  const outstanding = await executeQuery(
    `SELECT a.advance_id,
            a.amount - COALESCE((SELECT SUM(r.amount) FROM salary_advance_recoveries r WHERE r.advance_id = a.advance_id), 0) AS balance
     FROM salary_advances a
     WHERE a.employee_id = ? AND a.status = 'ACTIVE' HAVING balance > 0`,
    [request.employee_id]
  );
  const outstandingTotal = outstanding.reduce((s, a) => s + Number(a.balance), 0);

  await logAudit({ tableName: 'resignation_requests', recordId: request.request_id, action: 'RELIEVED', req,
    newValues: { status: 'RELIEVED', employee_status: 'RESIGNED', date_of_leaving: lwd } });

  const updated = await fetchRequestOr404(request.request_id, req);
  res.json({
    success: true,
    message: 'Employee relieved and marked as resigned',
    data: updated,
    outstanding_advance: outstanding.length > 0 ? { count: outstanding.length, total_balance: outstandingTotal } : null,
  });
});

// ==============================================
// POST /resignations/:id/cancel  (Admin)
// ==============================================
const cancelRequest = asyncHandler(async (req, res) => {
  const request = await fetchRequestOr404(req.params.id, req);
  if (!['PENDING', 'APPROVED'].includes(request.status)) {
    throw new ValidationError(`Only a PENDING or APPROVED request can be cancelled (this one is ${request.status})`);
  }
  await executeQuery('UPDATE resignation_requests SET status = ? WHERE request_id = ?', ['CANCELLED', request.request_id]);
  await logAudit({ tableName: 'resignation_requests', recordId: request.request_id, action: 'CANCELLED', req,
    oldValues: { status: request.status }, newValues: { status: 'CANCELLED' } });
  res.json({ success: true, message: 'Resignation request cancelled' });
});

module.exports = {
  raiseRequest,
  listRequests,
  getRequest,
  approveRequest,
  rejectRequest,
  relieveRequest,
  cancelRequest,
};
