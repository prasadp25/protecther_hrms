import { useState, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { toast } from 'react-toastify';
import { complianceService } from '../../services/complianceService';

const inr = (v) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(v) || 0);
const dmy = (v) => (v ? String(v).slice(0, 10).split('-').reverse().join('/') : '-');

// Default the month filter to the previous month (most likely to have payslips).
const prevMonth = () => {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

// Financial year (accounting year) that a date falls in: Jan–Mar belong to the
// FY that started the previous April. Returns the start year (FY start-Apr).
const fyOf = (date) => (date.getMonth() + 1 >= 4 ? date.getFullYear() : date.getFullYear() - 1);
const fyLabel = (startYear) => `${startYear}-${String(startYear + 1).slice(-2)}`;
// Last 5 financial years, newest first, for the Form C dropdown.
const FY_OPTIONS = (() => {
  const cur = fyOf(new Date());
  return Array.from({ length: 5 }, (_, i) => cur - i);
})();

// Column spec per register. fmt: money | date | bool | text
const TABS = [
  {
    key: 'bonus', label: 'Bonus Register', usesMonth: true,
    fetch: (month) => complianceService.getBonusRegister({ month }),
    note: 'Statutory bonus (8.33%) accrued within each employee’s CTC. Payment of Bonus Act.',
    columns: [
      { h: 'Code', k: 'employee_code' }, { h: 'Name', k: 'employee_name' },
      { h: 'Designation', k: 'designation' }, { h: 'Site', k: 'site_name' },
      { h: 'Basic', k: 'basic_salary', fmt: 'money' },
      { h: 'Days', k: 'days_present' }, { h: 'Bonus', k: 'bonus', fmt: 'money' },
    ],
    totals: ['bonus'],
  },
  {
    key: 'gratuity', label: 'Gratuity Liability', usesMonth: false,
    fetch: () => complianceService.getGratuityLiability(),
    note: 'Accrued gratuity provision (4.81% of basic) — payable on exit after 5 years per Gratuity Act. NOT a monthly payout.',
    columns: [
      { h: 'Code', k: 'employee_code' }, { h: 'Name', k: 'employee_name' },
      { h: 'DOJ', k: 'date_of_joining', fmt: 'date' }, { h: 'Status', k: 'status' },
      { h: 'Current Basic', k: 'current_basic', fmt: 'money' },
      { h: 'Years', k: 'years_of_service' },
      { h: 'Accrued Gratuity', k: 'accrued_gratuity', fmt: 'money' },
      { h: 'Est. Payable on Exit', k: 'est_payable_on_exit', fmt: 'money' },
      { h: '5yr Eligible', k: 'eligible_5yr', fmt: 'bool' },
    ],
    totals: ['accrued_gratuity'],
  },
  {
    key: 'pf', label: 'PF Register', usesMonth: true,
    fetch: (month) => complianceService.getPFRegister({ month }),
    note: 'Provident Fund — employee 12%, employer EPS 8.33% + EPF 3.67%. Download the PF ECR text file for EPFO upload.',
    columns: [
      { h: 'Code', k: 'employee_code' }, { h: 'Name', k: 'employee_name' },
      { h: 'UAN', k: 'uan_no' }, { h: 'EPF Wages', k: 'epf_wages', fmt: 'money' },
      { h: 'Employee 12%', k: 'employee_pf', fmt: 'money' },
      { h: 'Employer EPS', k: 'employer_eps', fmt: 'money' },
      { h: 'Employer EPF', k: 'employer_epf', fmt: 'money' },
      { h: 'Total', k: 'total_pf', fmt: 'money' },
    ],
    totals: ['employee_pf', 'employer_eps', 'employer_epf', 'total_pf'],
  },
  {
    key: 'esi', label: 'ESI Register', usesMonth: true,
    fetch: (month) => complianceService.getESIRegister({ month }),
    note: 'Employee State Insurance — employee 0.75%, employer 3.25% (applies when gross < 21,000 and ESI is enabled).',
    columns: [
      { h: 'Code', k: 'employee_code' }, { h: 'Name', k: 'employee_name' },
      { h: 'ESI No', k: 'esi_no' }, { h: 'Gross', k: 'gross_salary', fmt: 'money' },
      { h: 'Employee 0.75%', k: 'employee_esi', fmt: 'money' },
      { h: 'Employer 3.25%', k: 'employer_esi', fmt: 'money' },
      { h: 'Total', k: 'total_esi', fmt: 'money' },
    ],
    totals: ['employee_esi', 'employer_esi', 'total_esi'],
  },
  {
    key: 'pt', label: 'Professional Tax', usesMonth: true,
    fetch: (month) => complianceService.getPTRegister({ month }),
    note: 'Professional Tax — flat monthly state slab.',
    columns: [
      { h: 'Code', k: 'employee_code' }, { h: 'Name', k: 'employee_name' },
      { h: 'State', k: 'state' }, { h: 'Company', k: 'company_name' },
      { h: 'Gross', k: 'gross_salary', fmt: 'money' },
      { h: 'Prof. Tax', k: 'professional_tax', fmt: 'money' },
    ],
    totals: ['professional_tax'],
  },
];

const cell = (row, col) => {
  const v = row[col.k];
  if (col.fmt === 'money') return inr(v);
  if (col.fmt === 'date') return dmy(v);
  if (col.fmt === 'bool') return v ? 'Yes' : 'No';
  return v ?? '-';
};

const Compliance = () => {
  const [activeKey, setActiveKey] = useState('bonus');
  const [month, setMonth] = useState(prevMonth());
  const [fy, setFy] = useState(fyOf(new Date())); // Form C accounting year (start year)
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);

  const tab = TABS.find((t) => t.key === activeKey);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await tab.fetch(month);
      if (res.success) { setRows(res.data || []); setSummary(res.summary || null); }
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to load register');
      setRows([]); setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [tab, month]);

  useEffect(() => { load(); }, [load]);

  const exportExcel = () => {
    if (!rows.length) { toast.info('Nothing to export'); return; }
    const aoa = rows.map((r) => {
      const o = {};
      tab.columns.forEach((c) => {
        o[c.h] = c.fmt === 'money' ? Math.round(Number(r[c.k]) || 0)
          : c.fmt === 'date' ? dmy(r[c.k])
          : c.fmt === 'bool' ? (r[c.k] ? 'Yes' : 'No')
          : (r[c.k] ?? '');
      });
      return o;
    });
    const ws = XLSX.utils.json_to_sheet(aoa);
    ws['!cols'] = tab.columns.map((c) => ({ wch: Math.max(c.h.length + 2, 12) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, tab.label.slice(0, 30));
    const suffix = tab.usesMonth ? `_${month}` : '';
    XLSX.writeFile(wb, `${tab.key.toUpperCase()}_Register${suffix}.xlsx`);
  };

  // Statutory Form C (Payment of Bonus Rules 1975, Rule 4(c)) for the selected
  // accounting year (Apr–Mar). Blank deduction/payment/signature columns are for
  // the employer to fill.
  const generateFormC = async () => {
    let res;
    try { res = await complianceService.getBonusFormC({ fy }); }
    catch (e) { toast.error(e.response?.data?.message || 'Failed to build Form C'); return; }
    if (!res.success) return;
    const rows = res.data || [];
    const yearLabel = res.summary.fy_label;
    if (!rows.length) { toast.info(`No bonus records for FY ${yearLabel}`); return; }
    const N = 15;
    const pad = (a) => { const x = a.slice(); while (x.length < N) x.push(''); return x; };
    const title = [
      pad(['FORM C']),
      pad([`Bonus Register — ${res.summary.company || ''}`]),
      pad([`Register showing bonus due, deductions (sec. 17 & 18) and amount disbursed — Accounting Year ${yearLabel}`]),
      pad([]),
    ];
    const headTop = ['Sl. No.', 'Name of the employee', 'Whether completed 15 yrs of age at beginning of accounting year', 'Designation', 'No. of days worked in the year', 'Total salary or wage (Basic)', 'Amount of bonus payable under sec. 10/11', 'Deductions', '', '', '', 'Net amount payable (7−8)', 'Amount actually paid', 'Date on which paid', 'Signature / thumb-impression'];
    const headSub = ['', '', '', '', '', '', '', 'Puja/customary bonus (sec.17)', 'Interim bonus / advance (sec.17)', 'Income-tax deducted', 'Financial loss by misconduct (sec.18)', '', '', '', ''];
    const body = rows.map((r, i) => [i + 1, r.employee_name, r.completed_15, r.designation || '', Number(r.days_worked || 0), Number(r.total_wages || 0), Number(r.total_bonus || 0), '', '', '', '', Number(r.total_bonus || 0), '', '', '']);
    const total = rows.reduce((s, r) => s + Number(r.total_bonus || 0), 0);
    const totalRow = ['', `Total — ${rows.length} employees`, '', '', '', '', total, '', '', '', '', total, '', '', ''];
    const aoa = [...title, headTop, headSub, ...body, totalRow];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const hTop = 4, hSub = 5;
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: N - 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: N - 1 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: N - 1 } },
      { s: { r: hTop, c: 7 }, e: { r: hTop, c: 10 } },
      ...[0, 1, 2, 3, 4, 5, 6, 11, 12, 13, 14].map((c) => ({ s: { r: hTop, c }, e: { r: hSub, c } })),
    ];
    ws['!cols'] = [6, 26, 16, 18, 10, 15, 15, 15, 15, 13, 16, 15, 15, 13, 18].map((w) => ({ wch: w }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Form C');
    XLSX.writeFile(wb, `Form_C_Bonus_FY_${yearLabel}.xlsx`);
  };

  const downloadECR = () => {
    // Reuse the existing PF ECR endpoint (opens the text file download)
    const base = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1');
    window.open(`${base}/ecr/generate/${month}`, '_blank');
  };

  const totalFor = (k) => rows.reduce((s, r) => s + (Number(r[k]) || 0), 0);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Statutory &amp; Compliance</h2>
        <p className="text-sm text-slate-500 mt-1">Bonus, gratuity, PF, ESI and Professional Tax registers — exportable for your records.</p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveKey(t.key)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg -mb-px border-b-2 ${activeKey === t.key ? 'border-blue-600 text-blue-700 bg-blue-50' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Controls */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex flex-wrap items-center gap-3">
        {tab.usesMonth && (
          <label className="text-sm text-slate-600 flex items-center gap-2">
            Month:
            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500" />
          </label>
        )}
        {!tab.usesMonth && <span className="text-sm text-slate-500">Cumulative across all payslips to date.</span>}
        <div className="ml-auto flex gap-2">
          {tab.key === 'bonus' && (
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-600 flex items-center gap-1.5">
                <span className="hidden sm:inline">Form C year:</span>
                <select value={fy} onChange={(e) => setFy(Number(e.target.value))}
                  className="px-2.5 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm">
                  {FY_OPTIONS.map((y) => (
                    <option key={y} value={y}>FY {fyLabel(y)}</option>
                  ))}
                </select>
              </label>
              <button onClick={generateFormC} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium whitespace-nowrap">
                Download Form C
              </button>
            </div>
          )}
          {tab.key === 'pf' && (
            <button onClick={downloadECR} className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 text-sm font-medium">
              Download PF ECR
            </button>
          )}
          <button onClick={exportExcel} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium">
            Export to Excel
          </button>
        </div>
      </div>

      {tab.note && (
        <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          ⚠ {tab.note} These are internal registers — confirm exact filing formats with your CA before submission.
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-slate-500">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="text-center py-12 text-slate-500">No records for this selection.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>{tab.columns.map((c) => (
                  <th key={c.h} className={`px-4 py-3 whitespace-nowrap ${c.fmt === 'money' ? 'text-right' : ''}`}>{c.h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.employee_code || i} className="border-t border-slate-100">
                    {tab.columns.map((c) => (
                      <td key={c.h} className={`px-4 py-2.5 whitespace-nowrap ${c.fmt === 'money' ? 'text-right font-medium text-slate-800' : 'text-slate-600'}`}>{cell(r, c)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 font-semibold text-slate-800">
                <tr>
                  {tab.columns.map((c, idx) => (
                    <td key={c.h} className={`px-4 py-3 whitespace-nowrap ${c.fmt === 'money' ? 'text-right' : ''}`}>
                      {idx === 0 ? `${rows.length} employees` : (tab.totals?.includes(c.k) ? inr(totalFor(c.k)) : '')}
                    </td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Compliance;
