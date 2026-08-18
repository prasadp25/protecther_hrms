import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { fnfService } from '../../services/fnfService';
import { employeeService } from '../../services/employeeService';
import authService from '../../services/authService';
import { formatCurrency } from '../../utils/format';

const LIVE = ['DRAFT', 'APPROVED', 'PAID'];
const emptyLine = (kind) => ({ kind, code: 'OTHER', label: '', amount: '', is_auto: false });

// Pre-labeled quick-add lines per section (the system can't derive these, so
// HR enters the amount — but the common labels are one click away).
const QUICK_LINES = {
  EARNING: [
    ['LEAVE_ENCASH', 'Leave encashment'],
    ['REIMBURSEMENT', 'Reimbursement / arrears'],
  ],
  RECOVERY: [
    ['NOTICE', 'Notice-period recovery'],
    ['ASSET', 'Asset / other recovery'],
  ],
};

const FnFSettlement = ({ employeeId, onBack }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settlement, setSettlement] = useState(null);
  const [items, setItems] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [employee, setEmployee] = useState(null);
  const [createForm, setCreateForm] = useState({ last_working_day: '', settlement_month: '' });

  const role = authService.getUser()?.role;
  const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';
  const status = settlement?.status;
  const isDraft = status === 'DRAFT';

  const loadFull = useCallback(async (fnfId) => {
    const res = await fnfService.get(fnfId);
    if (res.success) {
      setSettlement(res.data.settlement);
      setItems(res.data.items);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const listRes = await fnfService.list({ employee_id: employeeId });
      const live = (listRes.data || []).find((s) => LIVE.includes(s.status));
      if (live) {
        await loadFull(live.fnf_id);
      } else {
        // No live settlement — show the create panel, prefill from the employee.
        const emp = await employeeService.getEmployeeById(employeeId);
        const e = emp.data || emp;
        setEmployee(e);
        const lwd = e?.date_of_leaving ? String(e.date_of_leaving).slice(0, 10) : '';
        setCreateForm({ last_working_day: lwd, settlement_month: lwd ? lwd.slice(0, 7) : '' });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load settlement');
    } finally {
      setLoading(false);
    }
  }, [employeeId, loadFull]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    setSaving(true);
    try {
      const res = await fnfService.createDraft(employeeId, createForm);
      if (res.success) {
        setSettlement(res.data.settlement);
        setItems(res.data.items);
        setWarnings(res.data.warnings || []);
        toast.success('Draft settlement created');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create settlement');
    } finally {
      setSaving(false);
    }
  };

  // ---- line editing (manual lines only) ----
  const manualLines = items.filter((i) => !i.is_auto);
  const autoLines = items.filter((i) => i.is_auto);

  const updateManual = (idx, patch) => {
    const next = [...manualLines];
    next[idx] = { ...next[idx], ...patch };
    setItems([...autoLines, ...next]);
  };
  const addManual = (kind) => setItems([...items, emptyLine(kind)]);
  const removeManual = (idx) => {
    const next = manualLines.filter((_, i) => i !== idx);
    setItems([...autoLines, ...next]);
  };
  // Quick-add a pre-labeled manual line (speeds common entries).
  const addLabeled = (kind, code, label) => setItems([...items, { kind, code, label, amount: '', is_auto: false }]);

  // Live totals from the in-memory items so the figures update as you type,
  // before Save (the server value only refreshes on Save).
  const sumKind = (k) => items.filter((i) => i.kind === k).reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const liveEarnings = sumKind('EARNING');
  const liveRecoveries = sumKind('RECOVERY');
  const liveNet = liveEarnings - liveRecoveries;

  // Gratuity override: the sanctioned way to include a statutory gratuity lump
  // sum for an employee NOT on the monthly-folded model (the default excludes
  // it — see spec §2). Prefilled with the statutory estimate, editable after.
  const GRATUITY_OVERRIDE = 'GRATUITY_OVERRIDE';
  const hasGratuityOverride = items.some((i) => i.code === GRATUITY_OVERRIDE);
  const addGratuityOverride = () => setItems([...items, {
    kind: 'EARNING', code: GRATUITY_OVERRIDE,
    label: 'Statutory gratuity (not paid monthly)',
    amount: Number(settlement?.ref_statutory_gratuity) || 0, is_auto: false,
  }]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const lines = manualLines.map((l) => ({
        kind: l.kind, code: l.code || 'OTHER', label: l.label, amount: Number(l.amount) || 0, is_auto: false,
      }));
      const res = await fnfService.update(settlement.fnf_id, {
        last_working_day: settlement.last_working_day
          ? String(settlement.last_working_day).slice(0, 10) : undefined,
        remarks: settlement.remarks || '',
        lines,
      });
      if (res.success) {
        setSettlement(res.data.settlement);
        setItems(res.data.items);
        toast.success('Settlement saved');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const doTransition = async (fn, okMsg) => {
    setSaving(true);
    try {
      const res = await fn(settlement.fnf_id);
      if (res.success) {
        toast.success(okMsg);
        if (res.data?.status === 'CANCELLED' || !res.data) { onBack?.(); return; }
        await loadFull(settlement.fnf_id);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = async () => {
    try {
      const { pdf } = await import('@react-pdf/renderer');
      const { default: FnFStatementPDF } = await import('./FnFStatementPDF');
      const blob = await pdf(<FnFStatementPDF settlement={settlement} items={items} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `FnF_${settlement.employee_code}_${settlement.settlement_month}.pdf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch {
      toast.error('Failed to generate statement');
    }
  };

  if (loading) return <div className="p-6 text-gray-500">Loading settlement…</div>;

  // ---- No settlement yet: create panel ----
  if (!settlement) {
    const canCreate = employee && ['RESIGNED', 'TERMINATED'].includes(employee.status);
    return (
      <div className="p-6 max-w-xl">
        <button onClick={onBack} className="text-blue-600 mb-4">← Back to employees</button>
        <h2 className="text-xl font-bold mb-1">Full & Final Settlement</h2>
        <p className="text-gray-600 mb-4">
          {employee ? `${employee.first_name} ${employee.last_name} (${employee.employee_code})` : ''}
        </p>
        {!canCreate ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded p-4 text-yellow-800">
            The employee must be marked <strong>RESIGNED</strong> or <strong>TERMINATED</strong> (with a
            date of leaving) before a settlement can be created.
          </div>
        ) : (
          <div className="bg-white border rounded p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Last working day</label>
              <input type="date" value={createForm.last_working_day}
                onChange={(e) => setCreateForm({ ...createForm, last_working_day: e.target.value })}
                className="mt-1 border rounded px-3 py-2 w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Settlement month</label>
              <input type="month" value={createForm.settlement_month}
                onChange={(e) => setCreateForm({ ...createForm, settlement_month: e.target.value })}
                className="mt-1 border rounded px-3 py-2 w-full" />
              <p className="text-xs text-gray-500 mt-1">Final salary is pulled from this month's payslip if it exists.</p>
            </div>
            <button onClick={handleCreate} disabled={saving}
              className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50">
              {saving ? 'Creating…' : 'Create draft settlement'}
            </button>
          </div>
        )}
      </div>
    );
  }

  // ---- Settlement view ----
  const net = liveNet;
  const recoverable = net < 0;
  const cents = (n) => Math.round(Number(n || 0) * 100);
  const dirty = isDraft && cents(liveNet) !== cents(settlement.net_payable);
  const badge = {
    DRAFT: 'bg-gray-100 text-gray-700', APPROVED: 'bg-blue-100 text-blue-700',
    PAID: 'bg-green-100 text-green-700', CANCELLED: 'bg-red-100 text-red-700',
  }[status] || 'bg-gray-100';

  // Rendered via {renderLines(kind)} — NOT as <LineRows/>. Defining a component
  // inside the render and mounting it as an element remounts its inputs on every
  // keystroke (focus loss); calling it as a plain function reconciles in place.
  const renderLines = (kind) => {
    const auto = autoLines.filter((i) => i.kind === kind);
    const manual = manualLines
      .map((l, idx) => ({ l, idx }))
      .filter(({ l }) => l.kind === kind);
    return (
      <div>
        {auto.map((it) => (
          <div key={it.item_id} className="flex items-center gap-2 py-1 text-sm">
            <span className="flex-1">{it.label}
              <span className="ml-2 text-[10px] bg-slate-100 text-slate-500 px-1 rounded">auto</span>
            </span>
            <span className="w-28 text-right">{formatCurrency(it.amount)}</span>
            <span className="w-6" />
          </div>
        ))}
        {manual.map(({ l, idx }) => (
          <div key={`m-${idx}`} className="flex items-center gap-2 py-1">
            <input value={l.label} disabled={!isDraft} placeholder="Description"
              onChange={(e) => updateManual(idx, { label: e.target.value })}
              className="flex-1 border rounded px-2 py-1 text-sm disabled:bg-gray-50" />
            <input type="number" value={l.amount} disabled={!isDraft} placeholder="0"
              onChange={(e) => updateManual(idx, { amount: e.target.value })}
              className="w-28 border rounded px-2 py-1 text-sm text-right disabled:bg-gray-50" />
            {isDraft ? (
              <button onClick={() => removeManual(idx)} className="w-6 text-red-500" title="Remove">×</button>
            ) : <span className="w-6" />}
          </div>
        ))}
        {isDraft && (
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <button onClick={() => addManual(kind)} className="text-blue-600 text-sm">+ Add line</button>
            {(QUICK_LINES[kind] || []).map(([code, label]) => (
              <button key={code} onClick={() => addLabeled(kind, code, label)}
                className="text-xs bg-slate-100 text-slate-600 rounded px-2 py-0.5 hover:bg-slate-200">
                + {label}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-6 max-w-4xl">
      <button onClick={onBack} className="text-blue-600 mb-4">← Back to employees</button>

      <div className="flex items-center justify-between mb-1">
        <h2 className="text-xl font-bold">Full & Final Settlement</h2>
        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${badge}`}>{status}</span>
      </div>
      <p className="text-gray-600 mb-4">
        {settlement.employee_name} ({settlement.employee_code}) · {settlement.separation_type} ·
        LWD {String(settlement.last_working_day).slice(0, 10)} ·
        {' '}{Number(settlement.completed_years || 0).toFixed(1)} yrs
      </p>

      {warnings.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-yellow-800 text-sm mb-4">
          {warnings.map((w, i) => <div key={i}>⚠ {w}</div>)}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white border rounded p-4">
          <h3 className="font-semibold text-green-700 border-b pb-1 mb-2">Earnings</h3>
          {renderLines('EARNING')}
          <div className="flex justify-between border-t mt-2 pt-2 font-semibold">
            <span>Total earnings</span><span>{formatCurrency(liveEarnings)}</span>
          </div>
        </div>
        <div className="bg-white border rounded p-4">
          <h3 className="font-semibold text-red-700 border-b pb-1 mb-2">Recoveries</h3>
          {renderLines('RECOVERY')}
          <div className="flex justify-between border-t mt-2 pt-2 font-semibold">
            <span>Total recoveries</span><span>{formatCurrency(liveRecoveries)}</span>
          </div>
        </div>
      </div>

      <div className={`mt-4 p-4 rounded border-2 ${recoverable ? 'border-red-300 bg-red-50' : 'border-slate-800 bg-slate-50'}`}>
        <div className="flex justify-between items-center">
          <span className="font-bold">
            {recoverable ? 'NET RECOVERABLE FROM EMPLOYEE' : 'NET F&F PAYABLE'}
            {dirty && <span className="ml-2 text-xs font-normal text-amber-600">unsaved — click Save</span>}
          </span>
          <span className="text-xl font-bold">{formatCurrency(Math.abs(net))}</span>
        </div>
      </div>

      <div className="mt-4 bg-gray-50 border rounded p-3 text-sm">
        <div className="font-semibold mb-1">Statutory reference — already paid monthly, not part of the payable</div>
        <div className="flex justify-between"><span>Gratuity accrued & paid monthly (to date)</span><span>{formatCurrency(settlement.ref_accrued_gratuity)}</span></div>
        <div className="flex justify-between items-center">
          <span>Statutory gratuity estimate (15/26 × basic × yrs)</span>
          <span className="flex items-center gap-2">
            {formatCurrency(settlement.ref_statutory_gratuity)}
            {isDraft && !hasGratuityOverride && Number(settlement.ref_statutory_gratuity) > 0 && (
              <button onClick={addGratuityOverride}
                className="text-xs bg-amber-100 text-amber-800 border border-amber-300 rounded px-2 py-0.5 hover:bg-amber-200">
                + Add to payable
              </button>
            )}
            {hasGratuityOverride && <span className="text-xs text-amber-700">added below ↓</span>}
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Gratuity and statutory bonus are folded into monthly CTC and disbursed with each payslip,
          so they are not added as a lump sum by default (see spec §2). Use “Add to payable” only if
          this employee was <strong>not</strong> paid gratuity monthly.
        </p>
      </div>

      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700">Remarks</label>
        <textarea value={settlement.remarks || ''} disabled={!isDraft} rows={2}
          onChange={(e) => setSettlement({ ...settlement, remarks: e.target.value })}
          className="mt-1 border rounded px-3 py-2 w-full disabled:bg-gray-50" />
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        {isDraft && (
          <button onClick={handleSave} disabled={saving}
            className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50">
            {saving ? 'Saving…' : 'Save'}
          </button>
        )}
        {isDraft && isAdmin && (
          <button onClick={() => doTransition(fnfService.approve, 'Settlement approved')} disabled={saving}
            className="bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50">Approve</button>
        )}
        {status === 'APPROVED' && isAdmin && (
          <button onClick={() => doTransition(fnfService.pay, 'Marked as paid')} disabled={saving}
            className="bg-emerald-600 text-white px-4 py-2 rounded disabled:opacity-50">Mark as paid</button>
        )}
        <button onClick={handleDownload} className="bg-slate-700 text-white px-4 py-2 rounded">Download statement</button>
        {['DRAFT', 'APPROVED'].includes(status) && isAdmin && (
          <button onClick={() => { if (window.confirm('Cancel this settlement?')) doTransition(fnfService.cancel, 'Settlement cancelled'); }}
            disabled={saving} className="text-red-600 px-4 py-2">Cancel</button>
        )}
      </div>
    </div>
  );
};

export default FnFSettlement;
