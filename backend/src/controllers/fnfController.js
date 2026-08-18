const { executeQuery, withTransaction } = require('../config/database');
const { asyncHandler, NotFoundError, ValidationError, ConflictError } = require('../utils/errors');
const { getCompanyFilter } = require('../middleware/auth');
const { logAudit } = require('../utils/auditLogger');

// ==============================================
// Full & Final (F&F) Settlement — Phase 1
// See FNF_SETTLEMENT_SPECIFICATION.md.
//
// Policy: gratuity (4.81%) and bonus (8.33%) are already paid every month in
// this client's folded-CTC model, so the settlement does NOT add exit lump
// sums. The statutory gratuity figures are stored as reference only and are
// never part of net_payable.
// ==============================================

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const nameExpr = `TRIM(CONCAT(e.first_name, ' ', COALESCE(e.last_name, '')))`;
const EXIT_STATUSES = ['RESIGNED', 'TERMINATED'];
const LIVE_STATUSES = ['DRAFT', 'APPROVED', 'PAID']; // a CANCELLED one doesn't block a new draft

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

// Resolve the employee the settlement is for, enforcing company scope and the
// exit-state precondition. Returns the employee row or throws.
const loadExitEmployee = async (employeeId, req) => {
  const companyId = getCompanyFilter(req);
  const params = [employeeId];
  let q = `SELECT e.*, ${nameExpr} AS employee_name FROM employees e WHERE e.employee_id = ?`;
  if (companyId) { q += ' AND e.company_id = ?'; params.push(companyId); }
  const rows = await executeQuery(q, params);
  if (rows.length === 0) throw new NotFoundError('Employee not found');
  return rows[0];
};

// Sum line items and persist header totals. net_payable is signed (earnings −
// recoveries); a negative value means the amount is recoverable from the
// employee. Runs inside the caller's transaction when a conn is supplied.
const recomputeTotals = async (fnfId, conn = null) => {
  const run = conn ? (sql, p) => conn.query(sql, p).then(([r]) => r) : executeQuery;
  const items = await run('SELECT kind, amount FROM fnf_line_items WHERE fnf_id = ?', [fnfId]);
  let earnings = 0, recoveries = 0;
  for (const it of items) {
    if (it.kind === 'EARNING') earnings += Number(it.amount);
    else recoveries += Number(it.amount);
  }
  earnings = round2(earnings);
  recoveries = round2(recoveries);
  const net = round2(earnings - recoveries);
  await run(
    'UPDATE fnf_settlements SET total_earnings = ?, total_recoveries = ?, net_payable = ? WHERE fnf_id = ?',
    [earnings, recoveries, net, fnfId]
  );
  return { total_earnings: earnings, total_recoveries: recoveries, net_payable: net };
};

// Outstanding advance balances (same logic as the deactivation warning):
// advance amount minus everything already recovered, for ACTIVE advances.
const fetchOutstandingAdvances = (employeeId) => executeQuery(
  `SELECT a.advance_id,
          a.amount - COALESCE(
            (SELECT SUM(r.amount) FROM salary_advance_recoveries r WHERE r.advance_id = a.advance_id), 0
          ) AS balance
   FROM salary_advances a
   WHERE a.employee_id = ? AND a.status = 'ACTIVE'
   HAVING balance > 0`,
  [employeeId]
);

// Completed years of continuous service between joining and last working day.
const completedYears = (doj, lwd) => {
  if (!doj) return 0;
  const start = new Date(doj).getTime();
  const end = new Date(lwd).getTime();
  if (isNaN(start) || isNaN(end) || end < start) return 0;
  return (end - start) / (365.25 * 24 * 3600 * 1000);
};

const fetchSettlementOr404 = async (fnfId, req) => {
  const companyId = getCompanyFilter(req);
  const params = [fnfId];
  let q = `SELECT f.*, e.employee_code, ${nameExpr} AS employee_name, e.designation,
                  e.department, e.date_of_joining, e.date_of_leaving
           FROM fnf_settlements f
           JOIN employees e ON e.employee_id = f.employee_id
           WHERE f.fnf_id = ?`;
  if (companyId) { q += ' AND f.company_id = ?'; params.push(companyId); }
  const rows = await executeQuery(q, params);
  if (rows.length === 0) throw new NotFoundError('Settlement not found');
  return rows[0];
};

const fetchLineItems = (fnfId) =>
  executeQuery('SELECT * FROM fnf_line_items WHERE fnf_id = ? ORDER BY kind DESC, item_id', [fnfId]);

// ==============================================
// POST /fnf/employees/:id/draft  — create a DRAFT with auto-populated lines
// ==============================================
const createDraft = asyncHandler(async (req, res) => {
  const employeeId = req.params.id;
  const employee = await loadExitEmployee(employeeId, req);

  if (!EXIT_STATUSES.includes(employee.status)) {
    throw new ValidationError('Employee must be RESIGNED or TERMINATED before a settlement can be created');
  }
  if (!employee.date_of_leaving) {
    throw new ValidationError('Employee has no date of leaving');
  }

  // One live settlement per employee.
  const dup = await executeQuery(
    `SELECT fnf_id FROM fnf_settlements WHERE employee_id = ? AND status IN (?, ?, ?)`,
    [employeeId, ...LIVE_STATUSES]
  );
  if (dup.length > 0) {
    throw new ConflictError('A settlement already exists for this employee');
  }

  const lwd = (req.body.last_working_day && DATE_RE.test(req.body.last_working_day))
    ? req.body.last_working_day
    : new Date(employee.date_of_leaving).toISOString().slice(0, 10);
  const settlementMonth = (req.body.settlement_month && MONTH_RE.test(req.body.settlement_month))
    ? req.body.settlement_month
    : lwd.slice(0, 7);

  // Snapshots
  const activeSalary = await executeQuery(
    `SELECT basic_salary FROM salaries WHERE employee_id = ? AND status = 'ACTIVE' ORDER BY effective_from DESC LIMIT 1`,
    [employeeId]
  );
  const lastBasic = activeSalary.length > 0 ? Number(activeSalary[0].basic_salary) : 0;
  const years = completedYears(employee.date_of_joining, lwd);
  const [gr] = await executeQuery(
    'SELECT COALESCE(SUM(gratuity), 0) AS accrued FROM payslips WHERE employee_id = ?',
    [employeeId]
  );
  const refAccrued = round2(gr.accrued);
  // Statutory (15/26 × last basic × completed years), eligible only at 5+ years.
  const refStatutory = years >= 5 ? Math.round((lastBasic * 15 / 26) * Math.floor(years)) : 0;

  // Auto line items
  const warnings = [];
  const autoLines = [];

  // Final-month salary: reuse the already-computed payslip net (single source
  // of truth). If it isn't generated yet, HR adds it manually / generates first.
  const finalPayslip = await executeQuery(
    'SELECT payslip_id, net_salary FROM payslips WHERE employee_id = ? AND month = ? LIMIT 1',
    [employeeId, settlementMonth]
  );
  if (finalPayslip.length > 0) {
    autoLines.push({
      kind: 'EARNING', code: 'FINAL_SALARY',
      label: `Final month salary (${settlementMonth})`,
      amount: round2(finalPayslip[0].net_salary), is_auto: 1,
      source_ref: String(finalPayslip[0].payslip_id),
    });
  } else {
    warnings.push(`No payslip found for ${settlementMonth}. Generate the final payslip or add the final salary as a manual line.`);
  }

  // Outstanding advances → one recovery line each.
  const advances = await fetchOutstandingAdvances(employeeId);
  for (const a of advances) {
    autoLines.push({
      kind: 'RECOVERY', code: 'ADVANCE',
      label: `Advance recovery (#${a.advance_id})`,
      amount: round2(a.balance), is_auto: 1, source_ref: String(a.advance_id),
    });
  }

  const fnfId = await withTransaction(async (conn) => {
    const [ins] = await conn.query(
      `INSERT INTO fnf_settlements
        (employee_id, company_id, separation_type, last_working_day, settlement_month,
         last_basic, completed_years, ref_accrued_gratuity, ref_statutory_gratuity,
         status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT', ?)`,
      [employeeId, employee.company_id, employee.status, lwd, settlementMonth,
       lastBasic, round2(years), refAccrued, refStatutory, req.user.user_id || null]
    );
    const id = ins.insertId;
    for (const l of autoLines) {
      await conn.query(
        `INSERT INTO fnf_line_items (fnf_id, kind, code, label, amount, is_auto, source_ref)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, l.kind, l.code, l.label, l.amount, l.is_auto, l.source_ref]
      );
    }
    await recomputeTotals(id, conn);
    return id;
  });

  await logAudit({ tableName: 'fnf_settlements', recordId: fnfId, action: 'CREATE', req,
    newValues: { employee_id: employeeId, status: 'DRAFT', last_working_day: lwd } });

  const settlement = await fetchSettlementOr404(fnfId, req);
  const items = await fetchLineItems(fnfId);
  res.status(201).json({ success: true, message: 'Draft settlement created', data: { settlement, items, warnings } });
});

// ==============================================
// GET /fnf/:fnfId
// ==============================================
const getSettlement = asyncHandler(async (req, res) => {
  const settlement = await fetchSettlementOr404(req.params.fnfId, req);
  const items = await fetchLineItems(settlement.fnf_id);
  res.json({ success: true, data: { settlement, items } });
});

// ==============================================
// GET /fnf  — list (optional ?status=, ?employee_id=)
// ==============================================
const listSettlements = asyncHandler(async (req, res) => {
  const companyId = getCompanyFilter(req);
  const params = [];
  let q = `SELECT f.fnf_id, f.employee_id, e.employee_code, ${nameExpr} AS employee_name,
                  f.separation_type, f.last_working_day, f.settlement_month,
                  f.net_payable, f.status, f.created_at
           FROM fnf_settlements f
           JOIN employees e ON e.employee_id = f.employee_id
           WHERE 1=1`;
  if (companyId) { q += ' AND f.company_id = ?'; params.push(companyId); }
  if (req.query.status) { q += ' AND f.status = ?'; params.push(req.query.status); }
  if (req.query.employee_id) { q += ' AND f.employee_id = ?'; params.push(req.query.employee_id); }
  q += ' ORDER BY f.created_at DESC';
  const rows = await executeQuery(q, params);
  res.json({ success: true, data: rows });
});

// ==============================================
// PUT /fnf/:fnfId  — edit manual lines / LWD / remarks (DRAFT only)
// ==============================================
const updateSettlement = asyncHandler(async (req, res) => {
  const settlement = await fetchSettlementOr404(req.params.fnfId, req);
  if (settlement.status !== 'DRAFT') {
    throw new ValidationError(`Only a DRAFT settlement can be edited (this one is ${settlement.status})`);
  }
  const fnfId = settlement.fnf_id;

  const { last_working_day, remarks, lines } = req.body;
  if (last_working_day && !DATE_RE.test(last_working_day)) {
    throw new ValidationError('last_working_day must be YYYY-MM-DD');
  }

  // Manual lines only. Auto lines (is_auto=1) are system-owned and preserved.
  const manualLines = Array.isArray(lines) ? lines.filter((l) => !l.is_auto) : null;
  if (manualLines) {
    for (const l of manualLines) {
      if (!['EARNING', 'RECOVERY'].includes(l.kind)) throw new ValidationError('Line kind must be EARNING or RECOVERY');
      if (isNaN(Number(l.amount))) throw new ValidationError('Line amount must be a number');
      if (!l.label || !String(l.label).trim()) throw new ValidationError('Each line needs a label');
    }
  }

  await withTransaction(async (conn) => {
    if (last_working_day || remarks !== undefined) {
      await conn.query(
        'UPDATE fnf_settlements SET last_working_day = COALESCE(?, last_working_day), remarks = COALESCE(?, remarks) WHERE fnf_id = ?',
        [last_working_day || null, remarks !== undefined ? remarks : null, fnfId]
      );
    }
    if (manualLines) {
      await conn.query('DELETE FROM fnf_line_items WHERE fnf_id = ? AND is_auto = 0', [fnfId]);
      for (const l of manualLines) {
        await conn.query(
          `INSERT INTO fnf_line_items (fnf_id, kind, code, label, amount, is_auto, source_ref)
           VALUES (?, ?, ?, ?, ?, 0, NULL)`,
          [fnfId, l.kind, l.code || 'OTHER', String(l.label).trim(), round2(l.amount)]
        );
      }
    }
    await recomputeTotals(fnfId, conn);
  });

  await logAudit({ tableName: 'fnf_settlements', recordId: fnfId, action: 'UPDATE', req });
  const updated = await fetchSettlementOr404(fnfId, req);
  const items = await fetchLineItems(fnfId);
  res.json({ success: true, message: 'Settlement updated', data: { settlement: updated, items } });
});

// Shared state-transition handler.
const transition = (from, to, tsColumn, actorColumn, successMsg) => asyncHandler(async (req, res) => {
  const settlement = await fetchSettlementOr404(req.params.fnfId, req);
  if (settlement.status !== from) {
    throw new ValidationError(`Settlement must be ${from} to ${to === 'CANCELLED' ? 'cancel' : to.toLowerCase()} (this one is ${settlement.status})`);
  }
  const sets = ['status = ?'];
  const params = [to];
  if (tsColumn) { sets.push(`${tsColumn} = NOW()`); }
  if (actorColumn) { sets.push(`${actorColumn} = ?`); params.push(req.user.user_id || null); }
  params.push(settlement.fnf_id);
  await executeQuery(`UPDATE fnf_settlements SET ${sets.join(', ')} WHERE fnf_id = ?`, params);

  await logAudit({ tableName: 'fnf_settlements', recordId: settlement.fnf_id, action: to, req,
    oldValues: { status: from }, newValues: { status: to } });
  const updated = await fetchSettlementOr404(settlement.fnf_id, req);
  res.json({ success: true, message: successMsg, data: updated });
});

const approveSettlement = transition('DRAFT', 'APPROVED', 'approved_at', 'approved_by', 'Settlement approved');
const paySettlement = transition('APPROVED', 'PAID', 'paid_at', null, 'Settlement marked as paid');

// Cancel is allowed from DRAFT or APPROVED (not from PAID).
const cancelSettlement = asyncHandler(async (req, res) => {
  const settlement = await fetchSettlementOr404(req.params.fnfId, req);
  if (!['DRAFT', 'APPROVED'].includes(settlement.status)) {
    throw new ValidationError(`Only a DRAFT or APPROVED settlement can be cancelled (this one is ${settlement.status})`);
  }
  await executeQuery('UPDATE fnf_settlements SET status = ? WHERE fnf_id = ?', ['CANCELLED', settlement.fnf_id]);
  await logAudit({ tableName: 'fnf_settlements', recordId: settlement.fnf_id, action: 'CANCELLED', req,
    oldValues: { status: settlement.status }, newValues: { status: 'CANCELLED' } });
  res.json({ success: true, message: 'Settlement cancelled' });
});

module.exports = {
  createDraft,
  getSettlement,
  listSettlements,
  updateSettlement,
  approveSettlement,
  paySettlement,
  cancelSettlement,
};
