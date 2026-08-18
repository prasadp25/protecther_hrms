import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'react-toastify';
import { clearanceService } from '../../services/clearanceService';
import { employeeService } from '../../services/employeeService';
import authService from '../../services/authService';

const LIVE = ['PENDING', 'CLEARED'];
const STATUS_OPTS = [['PENDING', 'Pending'], ['CLEARED', 'Cleared'], ['NA', 'N/A']];

const Clearance = ({ employeeId, onBack }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clearance, setClearance] = useState(null);
  const [items, setItems] = useState([]);
  const [remarks, setRemarks] = useState('');
  const [employee, setEmployee] = useState(null);
  const keyCounter = useRef(0);

  const role = authService.getUser()?.role;
  const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';
  const status = clearance?.status;
  const editable = clearance && status !== 'CANCELLED';

  const withKeys = (rows) => rows.map((r) => ({ ...r, _k: r.item_id ?? `n${keyCounter.current++}` }));

  const applyData = (data) => {
    setClearance(data.clearance);
    setItems(withKeys(data.items));
    setRemarks(data.clearance.remarks || '');
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const listRes = await clearanceService.list({ employee_id: employeeId });
      const live = (listRes.data || []).find((c) => LIVE.includes(c.status));
      if (live) {
        const res = await clearanceService.get(live.clearance_id);
        if (res.success) applyData(res.data);
      } else {
        const emp = await employeeService.getEmployeeById(employeeId);
        setEmployee(emp.data || emp);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load clearance');
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => { load(); }, [load]);

  const handleStart = async () => {
    setSaving(true);
    try {
      const res = await clearanceService.start(employeeId);
      if (res.success) { applyData(res.data); toast.success('Clearance started'); }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to start clearance');
    } finally { setSaving(false); }
  };

  const updateItem = (idx, patch) => setItems(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  const removeItem = (idx) => setItems(items.filter((_, i) => i !== idx));
  const addItem = () => setItems([...items, { _k: `n${keyCounter.current++}`, label: '', status: 'PENDING', cleared_by: '', remarks: '' }]);

  const handleSave = async () => {
    for (const it of items) {
      if (!it.label || !it.label.trim()) { toast.error('Every item needs a label'); return; }
    }
    setSaving(true);
    try {
      const payload = {
        remarks,
        items: items.map((it) => ({
          item_id: it.item_id, label: it.label.trim(), status: it.status,
          cleared_by: it.cleared_by || null, remarks: it.remarks || null,
        })),
      };
      const res = await clearanceService.update(clearance.clearance_id, payload);
      if (res.success) { applyData(res.data); toast.success('Clearance saved'); }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  const handleCancel = async () => {
    if (!window.confirm('Cancel this clearance?')) return;
    setSaving(true);
    try {
      const res = await clearanceService.cancel(clearance.clearance_id);
      if (res.success) { toast.success('Clearance cancelled'); onBack?.(); }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel');
    } finally { setSaving(false); }
  };

  if (loading) return <div className="p-6 text-gray-500">Loading…</div>;

  // No live clearance — start panel
  if (!clearance) {
    const canStart = employee && ['RESIGNED', 'TERMINATED'].includes(employee.status);
    return (
      <div className="p-6 max-w-xl">
        <button onClick={onBack} className="text-blue-600 mb-4">← Back to employees</button>
        <h2 className="text-xl font-bold mb-1">No-dues Clearance</h2>
        <p className="text-gray-600 mb-4">
          {employee ? `${employee.first_name} ${employee.last_name} (${employee.employee_code})` : ''}
        </p>
        {!canStart ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded p-4 text-yellow-800">
            Clearance can only be started for employees marked <strong>RESIGNED</strong> or
            <strong> TERMINATED</strong>.
          </div>
        ) : (
          <button onClick={handleStart} disabled={saving}
            className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50">
            {saving ? 'Starting…' : 'Start clearance checklist'}
          </button>
        )}
      </div>
    );
  }

  const clearedCount = items.filter((i) => i.status !== 'PENDING').length;
  const allDone = items.length > 0 && clearedCount === items.length;
  const badge = {
    PENDING: 'bg-amber-100 text-amber-700', CLEARED: 'bg-green-100 text-green-700',
    CANCELLED: 'bg-red-100 text-red-700',
  }[status] || 'bg-gray-100';

  return (
    <div className="p-6 max-w-3xl">
      <button onClick={onBack} className="text-blue-600 mb-4">← Back to employees</button>
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-xl font-bold">No-dues Clearance</h2>
        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${badge}`}>{status}</span>
      </div>
      <p className="text-gray-600 mb-4">
        {clearance.employee_name} ({clearance.employee_code}) · {clearance.designation || '—'}
      </p>

      <div className="mb-3">
        <div className="flex justify-between text-sm mb-1">
          <span>{clearedCount} of {items.length} items resolved</span>
          <span>{allDone ? '✅ No dues — fully cleared' : 'Pending items remain'}</span>
        </div>
        <div className="w-full bg-gray-200 rounded h-2">
          <div className={`h-2 rounded ${allDone ? 'bg-green-500' : 'bg-amber-400'}`}
            style={{ width: `${items.length ? (clearedCount / items.length) * 100 : 0}%` }} />
        </div>
      </div>

      <div className="space-y-2">
        {items.map((it, idx) => (
          <div key={it._k} className="bg-white border rounded p-3">
            <div className="flex flex-wrap items-center gap-2">
              <input value={it.label} disabled={!editable} placeholder="Department / item"
                onChange={(e) => updateItem(idx, { label: e.target.value })}
                className="flex-1 min-w-[200px] border rounded px-2 py-1 text-sm disabled:bg-gray-50" />
              <select value={it.status} disabled={!editable}
                onChange={(e) => updateItem(idx, { status: e.target.value })}
                className={`border rounded px-2 py-1 text-sm ${it.status === 'CLEARED' ? 'bg-green-50' : it.status === 'NA' ? 'bg-gray-100' : 'bg-amber-50'}`}>
                {STATUS_OPTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              {editable && (
                <button onClick={() => removeItem(idx)} className="text-red-500 px-1" title="Remove">×</button>
              )}
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              <input value={it.cleared_by || ''} disabled={!editable} placeholder="Cleared by (name)"
                onChange={(e) => updateItem(idx, { cleared_by: e.target.value })}
                className="w-48 border rounded px-2 py-1 text-xs disabled:bg-gray-50" />
              <input value={it.remarks || ''} disabled={!editable} placeholder="Remarks"
                onChange={(e) => updateItem(idx, { remarks: e.target.value })}
                className="flex-1 min-w-[160px] border rounded px-2 py-1 text-xs disabled:bg-gray-50" />
            </div>
          </div>
        ))}
      </div>

      {editable && (
        <button onClick={addItem} className="text-blue-600 text-sm mt-2">+ Add checklist item</button>
      )}

      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700">Overall remarks</label>
        <textarea value={remarks} disabled={!editable} rows={2}
          onChange={(e) => setRemarks(e.target.value)}
          className="mt-1 border rounded px-3 py-2 w-full disabled:bg-gray-50" />
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        {editable && (
          <button onClick={handleSave} disabled={saving}
            className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50">
            {saving ? 'Saving…' : 'Save'}
          </button>
        )}
        {editable && isAdmin && (
          <button onClick={handleCancel} disabled={saving} className="text-red-600 px-4 py-2">Cancel clearance</button>
        )}
      </div>
    </div>
  );
};

export default Clearance;
