import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { leaveService } from '../../services/leaveService';
import { employeeService } from '../../services/employeeService';

const fmt = (d) => (d ? String(d).slice(0, 10) : '—');
const TYPES = [['CASUAL', 'Casual'], ['SICK', 'Sick'], ['PERSONAL', 'Personal'], ['OTHER', 'Other']];
const STATUS_BADGE = {
  PENDING: 'bg-amber-100 text-amber-700', APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700', WITHDRAWN: 'bg-gray-100 text-gray-600', CANCELLED: 'bg-gray-100 text-gray-600',
};
const FILTERS = [['PENDING', 'Pending'], ['APPROVED', 'Approved'], ['ALL', 'All']];

const LeaveList = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('PENDING');
  const [busy, setBusy] = useState(false);
  const [reject, setReject] = useState(null); // { leave, note }

  const [showNew, setShowNew] = useState(false);
  const [activeEmps, setActiveEmps] = useState([]);
  const [form, setForm] = useState({ employee_id: '', leave_type: 'CASUAL', from_date: '', to_date: '', reason: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = filter === 'ALL' ? {} : { status: filter };
      const res = await leaveService.list(params);
      setRows(res.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load leave requests');
    } finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const openNew = async () => {
    setShowNew(true);
    if (activeEmps.length === 0) {
      try { const res = await employeeService.getActiveEmployees(); setActiveEmps(res.data || []); } catch { /* ignore */ }
    }
  };

  const submitNew = async () => {
    if (!form.employee_id || !form.from_date || !form.to_date) { toast.error('Pick employee and dates'); return; }
    setBusy(true);
    try {
      const res = await leaveService.raise(form.employee_id, form);
      if (res.success) { toast.success('Leave raised'); setShowNew(false); setForm({ employee_id: '', leave_type: 'CASUAL', from_date: '', to_date: '', reason: '' }); load(); }
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to raise'); } finally { setBusy(false); }
  };

  const approve = async (r) => {
    setBusy(true);
    try { const res = await leaveService.approve(r.leave_id); if (res.success) { toast.success('Leave approved'); load(); } }
    catch (err) { toast.error(err.response?.data?.message || 'Failed'); } finally { setBusy(false); }
  };
  const doReject = async () => {
    setBusy(true);
    try { const res = await leaveService.reject(reject.leave.leave_id, { note: reject.note }); if (res.success) { toast.success('Leave rejected'); setReject(null); load(); } }
    catch (err) { toast.error(err.response?.data?.message || 'Failed'); } finally { setBusy(false); }
  };
  const cancel = async (r) => {
    if (!window.confirm('Cancel this leave?')) return;
    setBusy(true);
    try { const res = await leaveService.cancel(r.leave_id); if (res.success) { toast.success('Leave cancelled'); load(); } }
    catch (err) { toast.error(err.response?.data?.message || 'Failed'); } finally { setBusy(false); }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          {FILTERS.map(([v, l]) => (
            <button key={v} onClick={() => setFilter(v)}
              className={`px-3 py-1 rounded text-sm ${filter === v ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}>{l}</button>
          ))}
        </div>
        <button onClick={openNew} className="bg-blue-600 text-white px-4 py-2 rounded text-sm">+ New request</button>
      </div>

      {showNew && (
        <div className="bg-white border rounded p-4 mb-4 max-w-2xl">
          <h3 className="font-semibold mb-3">Raise leave (on behalf)</h3>
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-600">Employee</label>
              <select value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })} className="mt-1 border rounded px-2 py-2 w-full text-sm">
                <option value="">Select an employee…</option>
                {activeEmps.map((e) => <option key={e.employee_id} value={e.employee_id}>{e.employee_code} — {e.first_name} {e.last_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600">Type</label>
              <select value={form.leave_type} onChange={(e) => setForm({ ...form, leave_type: e.target.value })} className="mt-1 border rounded px-2 py-2 w-full text-sm">
                {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600">From</label>
              <input type="date" value={form.from_date} onChange={(e) => setForm({ ...form, from_date: e.target.value })} className="mt-1 border rounded px-2 py-2 w-full text-sm" />
            </div>
            <div>
              <label className="block text-sm text-gray-600">To</label>
              <input type="date" value={form.to_date} onChange={(e) => setForm({ ...form, to_date: e.target.value })} className="mt-1 border rounded px-2 py-2 w-full text-sm" />
            </div>
          </div>
          <div className="mt-3">
            <label className="block text-sm text-gray-600">Reason (optional)</label>
            <textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} rows={2} className="mt-1 border rounded px-2 py-2 w-full text-sm" />
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={submitNew} disabled={busy} className="bg-blue-600 text-white px-4 py-2 rounded text-sm disabled:opacity-50">Submit</button>
            <button onClick={() => setShowNew(false)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
          </div>
        </div>
      )}

      {reject && (
        <div className="bg-white border rounded p-4 mb-4 max-w-2xl">
          <h3 className="font-semibold mb-2">Reject — {reject.leave.employee_name} ({reject.leave.employee_code})</h3>
          <textarea value={reject.note} onChange={(e) => setReject({ ...reject, note: e.target.value })} rows={2}
            placeholder="Reason (optional)" className="border rounded px-2 py-2 w-full text-sm" />
          <div className="mt-3 flex gap-2">
            <button onClick={doReject} disabled={busy} className="bg-red-600 text-white px-4 py-2 rounded text-sm disabled:opacity-50">Confirm reject</button>
            <button onClick={() => setReject(null)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
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
                <th className="text-left px-4 py-2">Type</th>
                <th className="text-left px-4 py-2">Dates</th>
                <th className="text-left px-4 py-2">Days</th>
                <th className="text-left px-4 py-2">By</th>
                <th className="text-left px-4 py-2">Status</th>
                <th className="text-left px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.leave_id} className="border-t">
                  <td className="px-4 py-2">{r.employee_name} <span className="text-gray-400">({r.employee_code})</span></td>
                  <td className="px-4 py-2">{r.leave_type}</td>
                  <td className="px-4 py-2 whitespace-nowrap">{fmt(r.from_date)} → {fmt(r.to_date)}</td>
                  <td className="px-4 py-2">{r.days}</td>
                  <td className="px-4 py-2">{r.submitted_by}</td>
                  <td className="px-4 py-2"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_BADGE[r.status] || 'bg-gray-100'}`}>{r.status}</span></td>
                  <td className="px-4 py-2 space-x-2 whitespace-nowrap">
                    {r.status === 'PENDING' && (
                      <>
                        <button onClick={() => approve(r)} disabled={busy} className="text-green-700">Approve</button>
                        <button onClick={() => setReject({ leave: r, note: '' })} className="text-red-600">Reject</button>
                      </>
                    )}
                    {r.status === 'APPROVED' && (
                      <button onClick={() => cancel(r)} className="text-gray-500">Cancel</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {rows.some((r) => r.status === 'APPROVED') && (
        <p className="mt-4 text-xs text-gray-500">
          Approved leave is unpaid — on the Attendance screen for the leave month, subtract these days from the employee's days present.
        </p>
      )}
    </div>
  );
};

export default LeaveList;
