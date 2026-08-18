import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { resignationService } from '../../services/resignationService';
import { employeeService } from '../../services/employeeService';
import authService from '../../services/authService';

const fmt = (d) => (d ? String(d).slice(0, 10) : '—');
const STATUS_BADGE = {
  PENDING: 'bg-amber-100 text-amber-700', APPROVED: 'bg-blue-100 text-blue-700',
  RELIEVED: 'bg-green-100 text-green-700', REJECTED: 'bg-red-100 text-red-700',
  WITHDRAWN: 'bg-gray-100 text-gray-600', CANCELLED: 'bg-gray-100 text-gray-600',
};
const FILTERS = [['ALL', 'All'], ['PENDING', 'Pending'], ['APPROVED', 'Approved'], ['DUE', 'Due to relieve']];

const ResignationList = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('PENDING');
  const [busy, setBusy] = useState(false);

  // new request
  const [showNew, setShowNew] = useState(false);
  const [activeEmps, setActiveEmps] = useState([]);
  const [form, setForm] = useState({ employee_id: '', requested_lwd: '', reason: '' });

  // inline action panel: { request, type: 'approve'|'reject', approved_lwd, note }
  const [action, setAction] = useState(null);

  const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(authService.getUser()?.role);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = filter === 'DUE' ? { due: '1' } : filter === 'ALL' ? {} : { status: filter };
      const res = await resignationService.list(params);
      setRows(res.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load requests');
    } finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const openNew = async () => {
    setShowNew(true);
    if (activeEmps.length === 0) {
      try {
        const res = await employeeService.getActiveEmployees();
        setActiveEmps(res.data || []);
      } catch { /* ignore */ }
    }
  };

  const submitNew = async () => {
    if (!form.employee_id || !form.requested_lwd) { toast.error('Pick an employee and last working day'); return; }
    setBusy(true);
    try {
      const res = await resignationService.raise(form.employee_id, { reason: form.reason, requested_lwd: form.requested_lwd });
      if (res.success) {
        toast.success('Resignation request raised');
        setShowNew(false); setForm({ employee_id: '', requested_lwd: '', reason: '' });
        load();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to raise request');
    } finally { setBusy(false); }
  };

  const startAction = (request, type) =>
    setAction({ request, type, approved_lwd: fmt(request.requested_lwd), note: '' });

  const submitAction = async () => {
    setBusy(true);
    try {
      const { request, type } = action;
      const res = type === 'approve'
        ? await resignationService.approve(request.request_id, { approved_lwd: action.approved_lwd, note: action.note })
        : await resignationService.reject(request.request_id, { note: action.note });
      if (res.success) { toast.success(type === 'approve' ? 'Approved' : 'Rejected'); setAction(null); load(); }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    } finally { setBusy(false); }
  };

  const relieve = async (request) => {
    if (!window.confirm(`Relieve ${request.employee_name}? This marks them RESIGNED as of ${fmt(request.approved_lwd)} and ends payroll.`)) return;
    setBusy(true);
    try {
      const res = await resignationService.relieve(request.request_id);
      if (res.success) {
        const owed = res.outstanding_advance;
        toast.success(owed ? `Relieved. ⚠ Outstanding advance ₹${owed.total_balance} — collect in F&F.` : 'Employee relieved and marked RESIGNED');
        load();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to relieve');
    } finally { setBusy(false); }
  };

  const cancel = async (request) => {
    if (!window.confirm('Cancel this resignation request?')) return;
    setBusy(true);
    try {
      const res = await resignationService.cancel(request.request_id);
      if (res.success) { toast.success('Request cancelled'); load(); }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel');
    } finally { setBusy(false); }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          {FILTERS.map(([v, l]) => (
            <button key={v} onClick={() => setFilter(v)}
              className={`px-3 py-1 rounded text-sm ${filter === v ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
              {l}
            </button>
          ))}
        </div>
        <button onClick={openNew} className="bg-blue-600 text-white px-4 py-2 rounded text-sm">+ New request</button>
      </div>

      {showNew && (
        <div className="bg-white border rounded p-4 mb-4 max-w-2xl">
          <h3 className="font-semibold mb-3">Raise a resignation (on behalf)</h3>
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-600">Employee</label>
              <select value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })}
                className="mt-1 border rounded px-2 py-2 w-full text-sm">
                <option value="">Select an active employee…</option>
                {activeEmps.map((e) => (
                  <option key={e.employee_id} value={e.employee_id}>{e.employee_code} — {e.first_name} {e.last_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600">Intended last working day</label>
              <input type="date" value={form.requested_lwd} onChange={(e) => setForm({ ...form, requested_lwd: e.target.value })}
                className="mt-1 border rounded px-2 py-2 w-full text-sm" />
            </div>
          </div>
          <div className="mt-3">
            <label className="block text-sm text-gray-600">Reason (optional)</label>
            <textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} rows={2}
              className="mt-1 border rounded px-2 py-2 w-full text-sm" />
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={submitNew} disabled={busy} className="bg-blue-600 text-white px-4 py-2 rounded text-sm disabled:opacity-50">Submit</button>
            <button onClick={() => setShowNew(false)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
          </div>
        </div>
      )}

      {action && (
        <div className="bg-white border rounded p-4 mb-4 max-w-2xl">
          <h3 className="font-semibold mb-3">
            {action.type === 'approve' ? 'Approve' : 'Reject'} — {action.request.employee_name} ({action.request.employee_code})
          </h3>
          {action.type === 'approve' && (
            <div className="mb-3">
              <label className="block text-sm text-gray-600">Agreed last working day</label>
              <input type="date" value={action.approved_lwd} onChange={(e) => setAction({ ...action, approved_lwd: e.target.value })}
                className="mt-1 border rounded px-2 py-2 text-sm" />
              <p className="text-xs text-gray-500 mt-1">Requested: {fmt(action.request.requested_lwd)}. Employee stays ACTIVE on payroll until this date.</p>
            </div>
          )}
          <div>
            <label className="block text-sm text-gray-600">Note (optional)</label>
            <textarea value={action.note} onChange={(e) => setAction({ ...action, note: e.target.value })} rows={2}
              className="mt-1 border rounded px-2 py-2 w-full text-sm" />
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={submitAction} disabled={busy}
              className={`text-white px-4 py-2 rounded text-sm disabled:opacity-50 ${action.type === 'approve' ? 'bg-green-600' : 'bg-red-600'}`}>
              Confirm {action.type}
            </button>
            <button onClick={() => setAction(null)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
          </div>
        </div>
      )}

      {loading ? <div className="text-gray-500">Loading…</div> : rows.length === 0 ? (
        <div className="text-gray-500">No requests.</div>
      ) : (
        <div className="bg-white border rounded overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-4 py-2">Employee</th>
                <th className="text-left px-4 py-2">By</th>
                <th className="text-left px-4 py-2">Requested LWD</th>
                <th className="text-left px-4 py-2">Agreed LWD</th>
                <th className="text-left px-4 py-2">Status</th>
                <th className="text-left px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.request_id} className="border-t">
                  <td className="px-4 py-2">{r.employee_name} <span className="text-gray-400">({r.employee_code})</span></td>
                  <td className="px-4 py-2">{r.submitted_by}</td>
                  <td className="px-4 py-2">{fmt(r.requested_lwd)}</td>
                  <td className="px-4 py-2">{fmt(r.approved_lwd)}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_BADGE[r.status] || 'bg-gray-100'}`}>{r.status}</span>
                    {Number(r.due_to_relieve) === 1 && <span className="ml-1 text-xs text-red-600">due</span>}
                  </td>
                  <td className="px-4 py-2 space-x-2 whitespace-nowrap">
                    {r.status === 'PENDING' && (
                      <>
                        <button onClick={() => startAction(r, 'approve')} className="text-green-700">Approve</button>
                        <button onClick={() => startAction(r, 'reject')} className="text-red-600">Reject</button>
                      </>
                    )}
                    {r.status === 'APPROVED' && (
                      <>
                        <button onClick={() => relieve(r)} disabled={busy || Number(r.due_to_relieve) !== 1}
                          className={Number(r.due_to_relieve) === 1 ? 'text-emerald-700 font-medium' : 'text-gray-400 cursor-not-allowed'}
                          title={Number(r.due_to_relieve) === 1 ? 'Relieve now' : `Relieve on ${fmt(r.approved_lwd)}`}>
                          Relieve
                        </button>
                        {isAdmin && <button onClick={() => cancel(r)} className="text-gray-500">Cancel</button>}
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ResignationList;
