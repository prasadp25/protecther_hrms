/**
 * Salary-advance recovery helpers.
 *
 * Both functions take a transaction connection `conn` (from withTransaction)
 * so recovery is atomic with the payslip insert. Outstanding balance is always
 * derived from the recovery ledger (amount - SUM(recoveries)), never stored,
 * so deleting a payslip (regeneration) auto-restores the balance via the FK
 * cascade — no double-recovery.
 */

/**
 * Work out how much to recover from each of an employee's active advances for
 * one payslip. Locks the advance rows (FOR UPDATE) so two concurrent payslip
 * generations for the same employee can't race the balance.
 * @returns {{recoveries: {advance_id:number, amount:number}[], total:number}}
 */
const computeRecoveries = async (conn, employeeId) => {
  const [rows] = await conn.query(
    `SELECT a.advance_id, a.monthly_recovery,
            a.amount - COALESCE(
              (SELECT SUM(r.amount) FROM salary_advance_recoveries r WHERE r.advance_id = a.advance_id),
            0) AS balance
     FROM salary_advances a
     WHERE a.employee_id = ? AND a.status = 'ACTIVE'
     ORDER BY a.advance_date ASC, a.advance_id ASC
     FOR UPDATE`,
    [employeeId]
  );

  const recoveries = [];
  let total = 0;
  for (const r of rows) {
    const balance = Number(r.balance) || 0;
    if (balance <= 0) continue; // fully recovered already
    const amt = Math.min(Number(r.monthly_recovery), balance);
    if (amt <= 0) continue;
    recoveries.push({ advance_id: r.advance_id, amount: amt });
    total += amt;
  }
  return { recoveries, total: Math.round(total * 100) / 100 };
};

/**
 * Write the recovery ledger rows for a just-generated payslip. Idempotent via
 * the UNIQUE(advance_id, payslip_id) key.
 */
const recordRecoveries = async (conn, payslipId, month, recoveries) => {
  for (const rec of recoveries) {
    await conn.query(
      `INSERT INTO salary_advance_recoveries (advance_id, payslip_id, month, amount)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE amount = VALUES(amount), month = VALUES(month)`,
      [rec.advance_id, payslipId, month, rec.amount]
    );
  }
};

module.exports = { computeRecoveries, recordRecoveries };
