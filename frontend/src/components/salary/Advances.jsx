import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { advanceService } from '../../services/advanceService';
import { employeeService } from '../../services/employeeService';

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount || 0);

const Advances = () => {
  const [advances, setAdvances] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    employee_id: '',
    amount: '',
    monthly_recovery: '',
    reason: '',
    advance_date: new Date().toISOString().split('T')[0],
  });

  const load = async () => {
    try {
      setLoading(true);
      const res = await advanceService.getAdvances();
      if (res.success) setAdvances(res.data);
    } catch {
      toast.error('Failed to load advances');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    employeeService.getActiveEmployees().then((r) => {
      if (r.success) setEmployees(r.data);
    }).catch(() => {});
  }, []);

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.employee_id || !form.amount || !form.monthly_recovery || !form.advance_date) {
      toast.error('Please fill employee, amount, monthly recovery and date');
      return;
    }
    if (parseFloat(form.monthly_recovery) > parseFloat(form.amount)) {
      toast.error('Monthly recovery cannot exceed the advance amount');
      return;
    }
    setSaving(true);
    try {
      const res = await advanceService.createAdvance({
        employee_id: parseInt(form.employee_id),
        amount: parseFloat(form.amount),
        monthly_recovery: parseFloat(form.monthly_recovery),
        reason: form.reason,
        advance_date: form.advance_date,
      });
      if (res.success) {
        toast.success('Advance recorded');
        setShowForm(false);
        setForm({ employee_id: '', amount: '', monthly_recovery: '', reason: '', advance_date: new Date().toISOString().split('T')[0] });
        load();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to record advance');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async (adv) => {
    if (!window.confirm(`Cancel this advance for ${adv.employee_name}? The remaining ${formatCurrency(adv.balance)} will be waived (no longer recovered).`)) return;
    try {
      const res = await advanceService.cancelAdvance(adv.advance_id);
      if (res.success) {
        toast.success('Advance cancelled');
        load();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to cancel');
    }
  };

  const statusLabel = (adv) => {
    if (adv.status === 'CANCELLED') return { text: 'Cancelled', cls: 'bg-gray-100 text-gray-600' };
    if (Number(adv.balance) <= 0) return { text: 'Cleared', cls: 'bg-green-100 text-green-700' };
    return { text: 'Active', cls: 'bg-amber-100 text-amber-700' };
  };

  const inputClass = 'w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Salary Advances</h2>
          <p className="text-sm text-slate-500 mt-1">Advances are auto-recovered from payslips until cleared</p>
        </div>
        <button onClick={() => setShowForm((s) => !s)} className="px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium">
          {showForm ? 'Close' : '+ Record Advance'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Employee *</label>
            <select name="employee_id" value={form.employee_id} onChange={handleChange} className={inputClass}>
              <option value="">Select employee</option>
              {employees.map((e) => (
                <option key={e.employee_id} value={e.employee_id}>{e.employee_code} — {e.first_name} {e.last_name || ''}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Advance Amount (₹) *</label>
            <input type="number" name="amount" value={form.amount} onChange={handleChange} min="1" className={inputClass} placeholder="e.g. 10000" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Recover per month (₹) *</label>
            <input type="number" name="monthly_recovery" value={form.monthly_recovery} onChange={handleChange} min="1" className={inputClass} placeholder="e.g. 2000" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Advance Date *</label>
            <input type="date" name="advance_date" value={form.advance_date} onChange={handleChange} className={inputClass} />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Reason</label>
            <input type="text" name="reason" value={form.reason} onChange={handleChange} className={inputClass} placeholder="Optional" />
          </div>
          <div className="md:col-span-2 flex justify-end">
            <button type="submit" disabled={saving} className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium">
              {saving ? 'Saving…' : 'Record Advance'}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-slate-500">Loading…</div>
        ) : advances.length === 0 ? (
          <div className="text-center py-12 text-slate-500">No advances recorded yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-right">Per Month</th>
                  <th className="px-4 py-3 text-right">Outstanding</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {advances.map((adv) => {
                  const s = statusLabel(adv);
                  return (
                    <tr key={adv.advance_id} className="border-t border-slate-100">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800">{adv.employee_name}</div>
                        <div className="text-xs text-slate-400">{adv.employee_code}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{adv.advance_date ? String(adv.advance_date).split('T')[0] : '-'}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(adv.amount)}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(adv.monthly_recovery)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-800">{formatCurrency(adv.balance)}</td>
                      <td className="px-4 py-3 text-slate-600">{adv.reason || '-'}</td>
                      <td className="px-4 py-3"><span className={`inline-block px-2 py-0.5 rounded-full text-xs ${s.cls}`}>{s.text}</span></td>
                      <td className="px-4 py-3 text-right">
                        {adv.status === 'ACTIVE' && Number(adv.balance) > 0 && (
                          <button onClick={() => handleCancel(adv)} className="text-red-600 hover:text-red-800 text-sm">Cancel</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Advances;
