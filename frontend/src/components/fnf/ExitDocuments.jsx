import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { employeeService } from '../../services/employeeService';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtDate = (d) => {
  if (!d) return '—';
  const [y, m, day] = String(d).slice(0, 10).split('-');
  return y && m && day ? `${day} ${MONTHS[parseInt(m, 10) - 1]} ${y}` : String(d);
};

const ExitDocuments = ({ employeeId, onBack }) => {
  const [loading, setLoading] = useState(true);
  const [employee, setEmployee] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await employeeService.getEmployeeById(employeeId);
      setEmployee(res.data || res);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load employee');
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => { load(); }, [load]);

  const download = async (which) => {
    try {
      const { pdf } = await import('@react-pdf/renderer');
      const mod = which === 'relieving'
        ? await import('./RelievingLetterPDF')
        : await import('./ExperienceCertificatePDF');
      const Template = mod.default;
      const blob = await pdf(<Template employee={employee} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const tag = which === 'relieving' ? 'Relieving' : 'Experience';
      a.download = `${tag}_${employee.employee_code}.pdf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch {
      toast.error('Failed to generate document');
    }
  };

  if (loading) return <div className="p-6 text-gray-500">Loading…</div>;
  if (!employee) return <div className="p-6">Employee not found.</div>;

  const exited = ['RESIGNED', 'TERMINATED'].includes(employee.status);
  const fullName = `${employee.first_name} ${employee.last_name || ''}`.trim();

  return (
    <div className="p-6 max-w-2xl">
      <button onClick={onBack} className="text-blue-600 mb-4">← Back to employees</button>
      <h2 className="text-xl font-bold mb-1">Exit Documents</h2>
      <p className="text-gray-600 mb-4">{fullName} ({employee.employee_code})</p>

      <div className="bg-white border rounded p-4 mb-4 text-sm grid grid-cols-2 gap-y-1">
        <div><span className="text-gray-500">Designation:</span> {employee.designation || '—'}</div>
        <div><span className="text-gray-500">Department:</span> {employee.department || '—'}</div>
        <div><span className="text-gray-500">Company:</span> {employee.company_name || '—'}</div>
        <div><span className="text-gray-500">Status:</span> {employee.status}</div>
        <div><span className="text-gray-500">Date of joining:</span> {fmtDate(employee.date_of_joining)}</div>
        <div><span className="text-gray-500">Last working day:</span> {fmtDate(employee.date_of_leaving)}</div>
      </div>

      {!exited ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded p-4 text-yellow-800">
          Exit documents are available only for employees marked <strong>RESIGNED</strong> or
          <strong> TERMINATED</strong> (with a date of leaving).
        </div>
      ) : (
        <div className="space-y-3">
          {!employee.date_of_leaving && (
            <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-yellow-800 text-sm">
              ⚠ No date of leaving is set — the letter will show a blank last working day. Set it on
              the employee record first for an accurate document.
            </div>
          )}
          <div className="flex flex-wrap gap-3">
            <button onClick={() => download('relieving')}
              className="bg-slate-700 text-white px-4 py-2 rounded">Download relieving letter</button>
            <button onClick={() => download('experience')}
              className="bg-slate-700 text-white px-4 py-2 rounded">Download experience certificate</button>
          </div>
          <p className="text-xs text-gray-500">
            Generated on {employee.company_name || 'company'} letterhead. Review before issuing —
            these are system-generated and valid without a physical signature.
          </p>
        </div>
      )}
    </div>
  );
};

export default ExitDocuments;
