const { executeQuery } = require('../config/database');
const { asyncHandler, NotFoundError, ValidationError, ConflictError } = require('../utils/errors');
const { getCompanyFilter } = require('../middleware/auth');
const { logAudit } = require('../utils/auditLogger');

// ==============================================
// Leave application (simple, unpaid) — Phase 1
// Employee applies (portal) -> HR approves/rejects. Approved leave is unpaid:
// its days are surfaced on the monthly Attendance screen and reduce days_present.
// See LEAVE_APPLICATION_SPECIFICATION.md.
// ==============================================

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const nameExpr = `TRIM(CONCAT(e.first_name, ' ', COALESCE(e.last_name, '')))`;
const TYPES = ['CASUAL', 'SICK', 'PERSONAL', 'OTHER'];

const inclusiveDays = (from, to) =>
  Math.floor((new Date(to).getTime() - new Date(from).getTime()) / 86400000) + 1;

// Reject a new range that overlaps an existing live (PENDING/APPROVED) leave.
const hasOverlap = async (employeeId, from, to, excludeId = null) => {
  const params = [employeeId, to, from];
  let q = `SELECT leave_id FROM leave_requests
           WHERE employee_id = ? AND status IN ('PENDING','APPROVED')
             AND from_date <= ? AND to_date >= ?`;
  if (excludeId) { q += ' AND leave_id <> ?'; params.push(excludeId); }
  const rows = await executeQuery(q, params);
  return rows.length > 0;
};

const fetchLeaveOr404 = async (leaveId, req) => {
  const companyId = getCompanyFilter(req);
  const params = [leaveId];
  let q = `SELECT l.*, e.employee_code, ${nameExpr} AS employee_name, e.designation
           FROM leave_requests l JOIN employees e ON e.employee_id = l.employee_id
           WHERE l.leave_id = ?`;
  if (companyId) { q += ' AND l.company_id = ?'; params.push(companyId); }
  const rows = await executeQuery(q, params);
  if (rows.length === 0) throw new NotFoundError('Leave request not found');
  return rows[0];
};

// Shared insert used by both portal apply and HR raise-on-behalf.
const createLeave = async ({ employeeId, companyId, submittedBy, body }) => {
  const { leave_type, from_date, to_date, reason } = body;
  if (!from_date || !DATE_RE.test(from_date) || !to_date || !DATE_RE.test(to_date)) {
    throw new ValidationError('Valid from_date and to_date (YYYY-MM-DD) are required');
  }
  if (to_date < from_date) throw new ValidationError('End date cannot be before start date');
  const type = TYPES.includes(leave_type) ? leave_type : 'CASUAL';
  if (await hasOverlap(employeeId, from_date, to_date)) {
    throw new ConflictError('These dates overlap an existing leave request');
  }
  const days = inclusiveDays(from_date, to_date);
  const result = await executeQuery(
    `INSERT INTO leave_requests (employee_id, company_id, leave_type, from_date, to_date, days, reason, submitted_by, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
    [employeeId, companyId, type, from_date, to_date, days, reason || null, submittedBy]
  );
  const rows = await executeQuery('SELECT * FROM leave_requests WHERE leave_id = ?', [result.insertId]);
  return rows[0];
};

// ==============================================
// PORTAL — employee self-service (req.employee)
// ==============================================
const applyLeave = asyncHandler(async (req, res) => {
  const emp = req.employee;
  const leave = await createLeave({ employeeId: emp.employee_id, companyId: emp.company_id, submittedBy: 'EMPLOYEE', body: req.body });
  res.status(201).json({ success: true, message: 'Leave applied — pending HR approval', data: leave });
});

const myLeaves = asyncHandler(async (req, res) => {
  const rows = await executeQuery(
    'SELECT * FROM leave_requests WHERE employee_id = ? ORDER BY leave_id DESC',
    [req.employee.employee_id]
  );
  res.json({ success: true, data: rows });
});

const withdrawLeave = asyncHandler(async (req, res) => {
  const rows = await executeQuery(
    "SELECT leave_id, status FROM leave_requests WHERE leave_id = ? AND employee_id = ?",
    [req.params.id, req.employee.employee_id]
  );
  if (rows.length === 0) throw new NotFoundError('Leave request not found');
  if (rows[0].status !== 'PENDING') throw new ValidationError('Only a pending request can be withdrawn');
  await executeQuery("UPDATE leave_requests SET status = 'WITHDRAWN' WHERE leave_id = ?", [rows[0].leave_id]);
  res.json({ success: true, message: 'Leave withdrawn' });
});

// ==============================================
// ADMIN — HR queue (req.user)
// ==============================================
const listLeaves = asyncHandler(async (req, res) => {
  const companyId = getCompanyFilter(req);
  const params = [];
  let q = `SELECT l.leave_id, l.employee_id, e.employee_code, ${nameExpr} AS employee_name,
                  l.leave_type, l.from_date, l.to_date, l.days, l.reason, l.status,
                  l.submitted_by, l.created_at
           FROM leave_requests l JOIN employees e ON e.employee_id = l.employee_id
           WHERE 1=1`;
  if (companyId) { q += ' AND l.company_id = ?'; params.push(companyId); }
  if (req.query.status) { q += ' AND l.status = ?'; params.push(req.query.status); }
  if (req.query.employee_id) { q += ' AND l.employee_id = ?'; params.push(req.query.employee_id); }
  if (req.query.month && MONTH_RE.test(req.query.month)) {
    q += ' AND l.from_date <= ? AND l.to_date >= ?';
    params.push(`${req.query.month}-31`, `${req.query.month}-01`);
  }
  q += ' ORDER BY l.created_at DESC';
  const rows = await executeQuery(q, params);
  res.json({ success: true, data: rows });
});

const raiseLeave = asyncHandler(async (req, res) => {
  const companyId = getCompanyFilter(req);
  const params = [req.params.id];
  let q = 'SELECT employee_id, company_id, status FROM employees WHERE employee_id = ?';
  if (companyId) { q += ' AND company_id = ?'; params.push(companyId); }
  const [emp] = await executeQuery(q, params);
  if (!emp) throw new NotFoundError('Employee not found');
  const leave = await createLeave({ employeeId: emp.employee_id, companyId: emp.company_id, submittedBy: 'HR', body: req.body });
  await logAudit({ tableName: 'leave_requests', recordId: leave.leave_id, action: 'CREATE', req });
  res.status(201).json({ success: true, message: 'Leave raised', data: leave });
});

const approveLeave = asyncHandler(async (req, res) => {
  const leave = await fetchLeaveOr404(req.params.id, req);
  if (leave.status !== 'PENDING') throw new ValidationError(`Only a PENDING request can be approved (this one is ${leave.status})`);
  await executeQuery(
    `UPDATE leave_requests SET status='APPROVED', decision_by=?, decision_at=NOW(), decision_note=? WHERE leave_id=?`,
    [req.user.user_id || null, req.body.note || null, leave.leave_id]
  );
  await logAudit({ tableName: 'leave_requests', recordId: leave.leave_id, action: 'APPROVED', req,
    oldValues: { status: 'PENDING' }, newValues: { status: 'APPROVED' } });
  res.json({ success: true, message: 'Leave approved', data: await fetchLeaveOr404(leave.leave_id, req) });
});

const rejectLeave = asyncHandler(async (req, res) => {
  const leave = await fetchLeaveOr404(req.params.id, req);
  if (leave.status !== 'PENDING') throw new ValidationError(`Only a PENDING request can be rejected (this one is ${leave.status})`);
  await executeQuery(
    `UPDATE leave_requests SET status='REJECTED', decision_by=?, decision_at=NOW(), decision_note=? WHERE leave_id=?`,
    [req.user.user_id || null, req.body.note || null, leave.leave_id]
  );
  await logAudit({ tableName: 'leave_requests', recordId: leave.leave_id, action: 'REJECTED', req,
    oldValues: { status: 'PENDING' }, newValues: { status: 'REJECTED' } });
  res.json({ success: true, message: 'Leave rejected', data: await fetchLeaveOr404(leave.leave_id, req) });
});

const cancelLeave = asyncHandler(async (req, res) => {
  const leave = await fetchLeaveOr404(req.params.id, req);
  if (!['PENDING', 'APPROVED'].includes(leave.status)) {
    throw new ValidationError(`Only a PENDING or APPROVED request can be cancelled (this one is ${leave.status})`);
  }
  await executeQuery("UPDATE leave_requests SET status='CANCELLED' WHERE leave_id=?", [leave.leave_id]);
  await logAudit({ tableName: 'leave_requests', recordId: leave.leave_id, action: 'CANCELLED', req,
    oldValues: { status: leave.status }, newValues: { status: 'CANCELLED' } });
  res.json({ success: true, message: 'Leave cancelled' });
});

// Per-employee approved unpaid-leave days that fall within a month — drives the
// Attendance screen. Counts the calendar-day overlap of each approved leave
// with the month (the "days not present" that reduce pay).
const monthSummary = asyncHandler(async (req, res) => {
  const { month } = req.params;
  if (!MONTH_RE.test(month)) throw new ValidationError('Invalid month. Use YYYY-MM.');
  const [y, m] = month.split('-').map(Number);
  const monthStart = `${month}-01`;
  const monthEnd = `${month}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`;
  const companyId = getCompanyFilter(req);
  // SELECT: LEAST(to,monthEnd), GREATEST(from,monthStart); WHERE overlap: from<=monthEnd, to>=monthStart
  const params = [monthEnd, monthStart, monthEnd, monthStart];
  let q = `SELECT employee_id,
                  SUM(DATEDIFF(LEAST(to_date, ?), GREATEST(from_date, ?)) + 1) AS unpaid_days
           FROM leave_requests
           WHERE status='APPROVED' AND from_date <= ? AND to_date >= ?`;
  if (companyId) { q += ' AND company_id = ?'; params.push(companyId); }
  q += ' GROUP BY employee_id';
  const rows = await executeQuery(q, params);
  const map = {};
  for (const r of rows) map[r.employee_id] = Number(r.unpaid_days);
  res.json({ success: true, data: { month, unpaid_by_employee: map } });
});

module.exports = {
  // portal
  applyLeave, myLeaves, withdrawLeave,
  // admin
  listLeaves, raiseLeave, approveLeave, rejectLeave, cancelLeave, monthSummary,
};
