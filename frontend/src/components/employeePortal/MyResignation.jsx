import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { employeePortalService } from '../../services/employeePortalService';

const fmt = (d) => (d ? String(d).slice(0, 10) : '—');
const LIVE = ['PENDING', 'APPROVED'];

const STATUS_STYLE = {
  PENDING: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-blue-100 text-blue-700',
  REJECTED: 'bg-red-100 text-red-700',
  WITHDRAWN: 'bg-gray-100 text-gray-600',
  CANCELLED: 'bg-gray-100 text-gray-600',
};

const MyResignation = () => {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [request, setRequest] = useState(null);
  const [form, setForm] = useState({ reason: '', requested_lwd: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await employeePortalService.getResignation();
      setRequest(res.data || null);
    } catch {
      toast.error('Could not load your resignation status');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    if (!form.requested_lwd) { toast.error('Please choose your intended last working day'); return; }
    setBusy(true);
    try {
      const res = await employeePortalService.submitResignation(form);
      if (res.success) { toast.success('Resignation submitted for approval'); setForm({ reason: '', requested_lwd: '' }); load(); }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit');
    } finally { setBusy(false); }
  };

  const withdraw = async () => {
    if (!window.confirm('Withdraw your resignation? This cancels the request.')) return;
    setBusy(true);
    try {
      const res = await employeePortalService.withdrawResignation();
      if (res.success) { toast.success('Resignation withdrawn'); load(); }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to withdraw');
    } finally { setBusy(false); }
  };

  if (loading) return <div className="p-6 text-gray-500">Loading…</div>;

  const isLive = request && LIVE.includes(request.status);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Resignation</h1>
      <p className="text-gray-500 mb-6">Submit your resignation for HR approval, or track its status here.</p>

      {isLive ? (
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800">Your resignation</h2>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_STYLE[request.status]}`}>{request.status}</span>
          </div>
          <dl className="grid grid-cols-2 gap-y-3 text-sm">
            <dt className="text-gray-500">Intended last working day</dt>
            <dd className="text-gray-800 font-medium">{fmt(request.requested_lwd)}</dd>
            {request.status === 'APPROVED' && (
              <>
                <dt className="text-gray-500">Approved last working day</dt>
                <dd className="text-gray-800 font-medium">{fmt(request.approved_lwd)}</dd>
              </>
            )}
            <dt className="text-gray-500">Reason</dt>
            <dd className="text-gray-800">{request.reason || '—'}</dd>
          </dl>

          {request.status === 'PENDING' && (
            <div className="mt-6 flex items-center gap-3">
              <button onClick={withdraw} disabled={busy}
                className="text-red-600 border border-red-200 hover:bg-red-50 px-4 py-2 rounded-lg text-sm disabled:opacity-50">
                Withdraw resignation
              </button>
              <span className="text-xs text-gray-400">Awaiting HR approval. You remain on payroll as normal.</span>
            </div>
          )}
          {request.status === 'APPROVED' && (
            <div className="mt-6 bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm text-blue-800">
              Approved. You&rsquo;ll remain active and on payroll until <b>{fmt(request.approved_lwd)}</b>, then HR will
              complete your relieving. Please coordinate your handover and clearance.
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border p-6">
          {request && ['REJECTED', 'WITHDRAWN', 'CANCELLED'].includes(request.status) && (
            <div className="mb-5 text-sm text-gray-500">
              Your previous request was <b className="text-gray-700">{request.status.toLowerCase()}</b> ({fmt(request.requested_lwd)}).
              You can submit a new one below.
            </div>
          )}
          <h2 className="font-semibold text-gray-800 mb-4">Submit a resignation</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Intended last working day</label>
              <input type="date" min={today} value={form.requested_lwd}
                onChange={(e) => setForm({ ...form, requested_lwd: e.target.value })}
                className="border rounded-lg px-3 py-2 w-full sm:w-64 text-sm" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Reason (optional)</label>
              <textarea value={form.reason} rows={3}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                className="border rounded-lg px-3 py-2 w-full text-sm" placeholder="Let your employer know why you're leaving (optional)" />
            </div>
            <div className="flex items-center gap-3">
              <button onClick={submit} disabled={busy}
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm disabled:opacity-50">
                {busy ? 'Submitting…' : 'Submit resignation'}
              </button>
              <span className="text-xs text-gray-400">This goes to HR for approval. You stay on payroll until your approved last day.</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyResignation;
