const { executeQuery, withTransaction } = require('../config/database');
const { asyncHandler, NotFoundError, ValidationError, ConflictError } = require('../utils/errors');
const { getCompanyFilter } = require('../middleware/auth');
const { logAudit } = require('../utils/auditLogger');

// ==============================================
// No-dues / Clearance checklist — Phase 3b
// Per-department exit sign-off for a RESIGNED/TERMINATED employee. The header
// rolls up to CLEARED once no item is still PENDING (all CLEARED or NA).
// ==============================================

const nameExpr = `TRIM(CONCAT(e.first_name, ' ', COALESCE(e.last_name, '')))`;
const EXIT_STATUSES = ['RESIGNED', 'TERMINATED'];
const LIVE_STATUSES = ['PENDING', 'CLEARED'];
const ITEM_STATUSES = ['PENDING', 'CLEARED', 'NA'];

// Standard departments seeded when a clearance is started.
const DEFAULT_ITEMS = [
  'IT / Systems — email & access revoked, devices returned',
  'Finance / Accounts — advances & dues settled',
  'Admin — ID card, keys & assets returned',
  'Reporting Manager — work handover completed',
  'HR — documents & exit formalities',
];

const loadExitEmployee = async (employeeId, req) => {
  const companyId = getCompanyFilter(req);
  const params = [employeeId];
  let q = `SELECT e.*, ${nameExpr} AS employee_name FROM employees e WHERE e.employee_id = ?`;
  if (companyId) { q += ' AND e.company_id = ?'; params.push(companyId); }
  const rows = await executeQuery(q, params);
  if (rows.length === 0) throw new NotFoundError('Employee not found');
  return rows[0];
};

const fetchClearanceOr404 = async (clearanceId, req) => {
  const companyId = getCompanyFilter(req);
  const params = [clearanceId];
  let q = `SELECT cl.*, e.employee_code, ${nameExpr} AS employee_name, e.designation, e.department,
                  e.date_of_leaving
           FROM employee_clearances cl
           JOIN employees e ON e.employee_id = cl.employee_id
           WHERE cl.clearance_id = ?`;
  if (companyId) { q += ' AND cl.company_id = ?'; params.push(companyId); }
  const rows = await executeQuery(q, params);
  if (rows.length === 0) throw new NotFoundError('Clearance not found');
  return rows[0];
};

const fetchItems = (clearanceId) =>
  executeQuery('SELECT * FROM clearance_items WHERE clearance_id = ? ORDER BY sort_order, item_id', [clearanceId]);

// Roll the header up from its items: CLEARED only when there is at least one
// item and none is still PENDING. Stamps cleared_at when it flips to CLEARED.
const recomputeStatus = async (clearanceId, conn) => {
  const run = (sql, p) => conn.query(sql, p).then(([r]) => r);
  const items = await run('SELECT status FROM clearance_items WHERE clearance_id = ?', [clearanceId]);
  const anyPending = items.length === 0 || items.some((i) => i.status === 'PENDING');
  const newStatus = anyPending ? 'PENDING' : 'CLEARED';
  await run(
    `UPDATE employee_clearances
       SET status = ?, cleared_at = ${newStatus === 'CLEARED' ? 'COALESCE(cleared_at, NOW())' : 'NULL'}
     WHERE clearance_id = ? AND status <> 'CANCELLED'`,
    [newStatus, clearanceId]
  );
  return newStatus;
};

// ==============================================
// POST /clearances/employees/:id/start
// ==============================================
const startClearance = asyncHandler(async (req, res) => {
  const employeeId = req.params.id;
  const employee = await loadExitEmployee(employeeId, req);
  if (!EXIT_STATUSES.includes(employee.status)) {
    throw new ValidationError('Employee must be RESIGNED or TERMINATED to start a clearance');
  }
  const dup = await executeQuery(
    'SELECT clearance_id FROM employee_clearances WHERE employee_id = ? AND status IN (?, ?)',
    [employeeId, ...LIVE_STATUSES]
  );
  if (dup.length > 0) throw new ConflictError('A clearance already exists for this employee');

  const clearanceId = await withTransaction(async (conn) => {
    const [ins] = await conn.query(
      `INSERT INTO employee_clearances (employee_id, company_id, status, created_by)
       VALUES (?, ?, 'PENDING', ?)`,
      [employeeId, employee.company_id, req.user.user_id || null]
    );
    const id = ins.insertId;
    for (let i = 0; i < DEFAULT_ITEMS.length; i++) {
      await conn.query(
        'INSERT INTO clearance_items (clearance_id, label, status, sort_order) VALUES (?, ?, ?, ?)',
        [id, DEFAULT_ITEMS[i], 'PENDING', i]
      );
    }
    return id;
  });

  await logAudit({ tableName: 'employee_clearances', recordId: clearanceId, action: 'CREATE', req,
    newValues: { employee_id: employeeId, status: 'PENDING' } });

  const clearance = await fetchClearanceOr404(clearanceId, req);
  const items = await fetchItems(clearanceId);
  res.status(201).json({ success: true, message: 'Clearance started', data: { clearance, items } });
});

// ==============================================
// GET /clearances/:id
// ==============================================
const getClearance = asyncHandler(async (req, res) => {
  const clearance = await fetchClearanceOr404(req.params.id, req);
  const items = await fetchItems(clearance.clearance_id);
  res.json({ success: true, data: { clearance, items } });
});

// ==============================================
// GET /clearances?employee_id=&status=
// ==============================================
const listClearances = asyncHandler(async (req, res) => {
  const companyId = getCompanyFilter(req);
  const params = [];
  let q = `SELECT cl.clearance_id, cl.employee_id, e.employee_code, ${nameExpr} AS employee_name,
                  cl.status, cl.created_at, cl.cleared_at,
                  (SELECT COUNT(*) FROM clearance_items ci WHERE ci.clearance_id = cl.clearance_id) AS total_items,
                  (SELECT COUNT(*) FROM clearance_items ci WHERE ci.clearance_id = cl.clearance_id AND ci.status = 'PENDING') AS pending_items
           FROM employee_clearances cl
           JOIN employees e ON e.employee_id = cl.employee_id
           WHERE 1=1`;
  if (companyId) { q += ' AND cl.company_id = ?'; params.push(companyId); }
  if (req.query.status) { q += ' AND cl.status = ?'; params.push(req.query.status); }
  if (req.query.employee_id) { q += ' AND cl.employee_id = ?'; params.push(req.query.employee_id); }
  q += ' ORDER BY cl.created_at DESC';
  const rows = await executeQuery(q, params);
  res.json({ success: true, data: rows });
});

// ==============================================
// PUT /clearances/:id — replace items + remarks, roll up status
// ==============================================
const updateClearance = asyncHandler(async (req, res) => {
  const clearance = await fetchClearanceOr404(req.params.id, req);
  if (clearance.status === 'CANCELLED') {
    throw new ValidationError('A cancelled clearance cannot be edited');
  }
  const clearanceId = clearance.clearance_id;
  const { remarks, items } = req.body;

  if (items !== undefined) {
    if (!Array.isArray(items)) throw new ValidationError('items must be an array');
    for (const it of items) {
      if (!it.label || !String(it.label).trim()) throw new ValidationError('Each item needs a label');
      if (it.status && !ITEM_STATUSES.includes(it.status)) throw new ValidationError('Invalid item status');
    }
  }

  await withTransaction(async (conn) => {
    if (remarks !== undefined) {
      await conn.query('UPDATE employee_clearances SET remarks = ? WHERE clearance_id = ?', [remarks, clearanceId]);
    }
    if (items !== undefined) {
      // Replace the whole checklist with the provided set (add/edit/remove).
      await conn.query('DELETE FROM clearance_items WHERE clearance_id = ?', [clearanceId]);
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        const st = it.status && ITEM_STATUSES.includes(it.status) ? it.status : 'PENDING';
        await conn.query(
          `INSERT INTO clearance_items (clearance_id, label, status, remarks, cleared_by, sort_order, cleared_at)
           VALUES (?, ?, ?, ?, ?, ?, ${st === 'CLEARED' ? 'NOW()' : 'NULL'})`,
          [clearanceId, String(it.label).trim(), st, it.remarks || null, it.cleared_by || null, i]
        );
      }
      await recomputeStatus(clearanceId, conn);
    }
  });

  await logAudit({ tableName: 'employee_clearances', recordId: clearanceId, action: 'UPDATE', req });
  const updated = await fetchClearanceOr404(clearanceId, req);
  const updatedItems = await fetchItems(clearanceId);
  res.json({ success: true, message: 'Clearance updated', data: { clearance: updated, items: updatedItems } });
});

// ==============================================
// POST /clearances/:id/cancel
// ==============================================
const cancelClearance = asyncHandler(async (req, res) => {
  const clearance = await fetchClearanceOr404(req.params.id, req);
  if (clearance.status === 'CANCELLED') {
    throw new ValidationError('Clearance is already cancelled');
  }
  await executeQuery('UPDATE employee_clearances SET status = ? WHERE clearance_id = ?', ['CANCELLED', clearance.clearance_id]);
  await logAudit({ tableName: 'employee_clearances', recordId: clearance.clearance_id, action: 'CANCELLED', req,
    oldValues: { status: clearance.status }, newValues: { status: 'CANCELLED' } });
  res.json({ success: true, message: 'Clearance cancelled' });
});

module.exports = {
  startClearance,
  getClearance,
  listClearances,
  updateClearance,
  cancelClearance,
};
