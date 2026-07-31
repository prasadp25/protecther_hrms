const { executeQuery } = require('../config/database');
const { getCompanyFilter } = require('../middleware/auth');

// Outstanding balance is always derived from the recovery ledger.
const BALANCE_EXPR = `a.amount - COALESCE((SELECT SUM(r.amount) FROM salary_advance_recoveries r WHERE r.advance_id = a.advance_id), 0)`;

// ==============================================
// LIST ADVANCES (company-scoped, optional ?employee_id / ?status)
// ==============================================
const getAdvances = async (req, res) => {
  try {
    const companyId = getCompanyFilter(req);
    const { employee_id, status } = req.query;

    let query = `
      SELECT a.advance_id, a.company_id, a.employee_id, a.amount, a.monthly_recovery,
             a.reason, a.advance_date, a.status, a.created_at,
             ${BALANCE_EXPR} AS balance,
             e.employee_code, TRIM(CONCAT(e.first_name, ' ', COALESCE(e.last_name, ''))) AS employee_name
      FROM salary_advances a
      JOIN employees e ON e.employee_id = a.employee_id
      WHERE 1=1
    `;
    const params = [];
    if (companyId) { query += ' AND a.company_id = ?'; params.push(companyId); }
    if (employee_id) { query += ' AND a.employee_id = ?'; params.push(employee_id); }
    if (status) { query += ' AND a.status = ?'; params.push(status); }
    query += ' ORDER BY a.status ASC, a.advance_date DESC, a.advance_id DESC';

    const advances = await executeQuery(query, params);
    res.status(200).json({ success: true, count: advances.length, data: advances });
  } catch (error) {
    console.error('Get advances error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch advances' });
  }
};

// ==============================================
// CREATE ADVANCE
// ==============================================
const createAdvance = async (req, res) => {
  try {
    const companyId = getCompanyFilter(req);
    const { employee_id, amount, monthly_recovery, reason, advance_date } = req.body;

    if (!employee_id || !amount || !monthly_recovery || !advance_date) {
      return res.status(400).json({ success: false, message: 'Employee, amount, monthly recovery, and date are required' });
    }
    const amt = parseFloat(amount);
    const monthly = parseFloat(monthly_recovery);
    if (!(amt > 0)) return res.status(400).json({ success: false, message: 'Amount must be greater than 0' });
    if (!(monthly > 0)) return res.status(400).json({ success: false, message: 'Monthly recovery must be greater than 0' });
    if (monthly > amt) return res.status(400).json({ success: false, message: 'Monthly recovery cannot exceed the advance amount' });

    // Employee must exist in the caller's company
    let empQuery = 'SELECT employee_id, company_id FROM employees WHERE employee_id = ?';
    const empParams = [employee_id];
    if (companyId) { empQuery += ' AND company_id = ?'; empParams.push(companyId); }
    const employees = await executeQuery(empQuery, empParams);
    if (employees.length === 0) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const result = await executeQuery(
      `INSERT INTO salary_advances (company_id, employee_id, amount, monthly_recovery, reason, advance_date, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [employees[0].company_id, employee_id, amt, monthly, reason || null, advance_date, req.user?.user_id || null]
    );

    res.status(201).json({
      success: true,
      message: 'Advance recorded',
      data: { advance_id: result.insertId }
    });
  } catch (error) {
    console.error('Create advance error:', error);
    res.status(500).json({ success: false, message: 'Failed to record advance' });
  }
};

// ==============================================
// CANCEL ADVANCE (waive the remaining balance; keeps history)
// ==============================================
const cancelAdvance = async (req, res) => {
  try {
    const companyId = getCompanyFilter(req);
    const { id } = req.params;

    let query = 'SELECT advance_id FROM salary_advances WHERE advance_id = ?';
    const params = [id];
    if (companyId) { query += ' AND company_id = ?'; params.push(companyId); }
    const rows = await executeQuery(query, params);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Advance not found' });
    }

    await executeQuery(`UPDATE salary_advances SET status = 'CANCELLED' WHERE advance_id = ?`, [id]);
    res.status(200).json({ success: true, message: 'Advance cancelled (remaining balance waived)' });
  } catch (error) {
    console.error('Cancel advance error:', error);
    res.status(500).json({ success: false, message: 'Failed to cancel advance' });
  }
};

// ==============================================
// RECOVERY HISTORY for one advance
// ==============================================
const getAdvanceRecoveries = async (req, res) => {
  try {
    const companyId = getCompanyFilter(req);
    const { id } = req.params;

    // Ensure the advance belongs to the caller's company
    let ownQuery = 'SELECT advance_id FROM salary_advances WHERE advance_id = ?';
    const ownParams = [id];
    if (companyId) { ownQuery += ' AND company_id = ?'; ownParams.push(companyId); }
    const own = await executeQuery(ownQuery, ownParams);
    if (own.length === 0) {
      return res.status(404).json({ success: false, message: 'Advance not found' });
    }

    const recoveries = await executeQuery(
      `SELECT recovery_id, payslip_id, month, amount, created_at
       FROM salary_advance_recoveries WHERE advance_id = ? ORDER BY month ASC`,
      [id]
    );
    res.status(200).json({ success: true, data: recoveries });
  } catch (error) {
    console.error('Get advance recoveries error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch recovery history' });
  }
};

module.exports = { getAdvances, createAdvance, cancelAdvance, getAdvanceRecoveries };
