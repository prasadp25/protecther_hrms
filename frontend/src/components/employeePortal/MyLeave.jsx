import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { employeePortalService } from '../../services/employeePortalService';

const fmt = (d) => (d ? String(d).slice(0, 10) : '—');
const TYPES = [['CASUAL', 'Casual'], ['SICK', 'Sick'], ['PERSONAL', 'Personal'], ['OTHER', 'Other']];
const STATUS_STYLE = {
  PENDING: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  WITHDRAWN: 'bg-gray-100 text-gray-600',
  CANCELLED: 'bg-gray-100 text-gray-600',
};

const MyLeave = () => {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [leaves, setLeaves] = useState([]);
  const [form, setForm] = useState({ leave_type: 'CASUAL', from_date: '', to_date: '', reason: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await employeePortalService.getLeaves();
      setLeaves(res.data || []);
    } catch {
      toast.error('Could not load your leave requests');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const dayCount = form.from_date && form.to_date && form.to_date >= form.from_date
    ? Math.floor((new Date(form.to_date) - new Date(form.from_date)) / 86400000) + 1 : 0;

  const apply = async () => {
    if (!form.from_date || !form.to_date) { toast.error('Choose start and end dates'); return; }
    if (form.to_date < form.from_date) { toast.error('End date cannot be before start date'); return; }
    setBusy(true);
    try {
      const res = await employeePortalService.applyLeave(form);
      if (res.success) { toast.success('Leave applied — pending HR approval'); setForm({ leave_type: 'CASUAL', from_date: '', to_date: '', reason: '' }); load(); }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to apply');
    } finally { setBusy(false); }
  };

  const withdraw = async (id) => {
    if (!window.confirm('Withdraw this leave request?')) return;
    setBusy(true);
    try {
      const res = await employeePortalService.withdrawLeave(id);
      if (res.success) { toast.success('Leave withdrawn'); load(); }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to withdraw');
    } finally { setBusy(false); }
  };

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Leave</h1>
      <p className="text-gray-500 mb-6">Apply for leave and track your requests.</p>

      <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
        <h2 className="font-semibold text-gray-800 mb-4">Apply for leave</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Type</label>
            <select value={form.leave_type} onChange={(e) => setForm({ ...form, leave_type: e.target.value })}
              className="border rounded-lg px-3 py-2 w-full text-sm">
              {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div className="flex items-end text-sm text-gray-500">
            {dayCount > 0 && <span>{dayCount} day{dayCount > 1 ? 's' : ''} selected</span>}
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">From</label>
            <input type="date" min={today} value={form.from_date}
              onChange={(e) => setForm({ ...form, from_date: e.target.value })}
              className="border rounded-lg px-3 py-2 w-full text-sm" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">To</label>
            <input type="date" min={form.from_date || today} value={form.to_date}
              onChange={(e) => setForm({ ...form, to_date: e.target.value })}
              className="border rounded-lg px-3 py-2 w-full text-sm" />
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-sm text-gray-600 mb-1">Reason (optional)</label>
          <textarea value={form.reason} rows={2}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
            className="border rounded-lg px-3 py-2 w-full text-sm" />
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button onClick={apply} disabled={busy}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm disabled:opacity-50">
            {busy ? 'Applying…' : 'Apply'}
          </button>
          <span className="text-xs text-amber-600">Note: leave is unpaid — approved days reduce that month's salary.</span>
        </div>
      </div>

      <h2 className="font-semibold text-gray-800 mb-3">Your requests</h2>
      {loading ? <div className="text-gray-500">Loading…</div> : leaves.length === 0 ? (
        <div className="text-gray-500 bg-white rounded-xl border p-6">No leave requests yet.</div>
      ) : (
        <div className="space-y-3">
          {leaves.map((l) => (
            <div key={l.leave_id} className="bg-white rounded-xl border p-4 flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-800">
                  {fmt(l.from_date)} → {fmt(l.to_date)} <span className="text-gray-400">· {l.days} day{l.days > 1 ? 's' : ''} · {l.leave_type}</span>
                </div>
                {l.reason && <div className="text-sm text-gray-500 mt-0.5">{l.reason}</div>}
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_STYLE[l.status]}`}>{l.status}</span>
                {l.status === 'PENDING' && (
                  <button onClick={() => withdraw(l.leave_id)} disabled={busy} className="text-red-600 text-sm hover:underline">Withdraw</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyLeave;
