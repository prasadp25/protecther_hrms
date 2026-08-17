import { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-toastify';
import { employeeService } from '../../services/employeeService';

// Mirror of the backend filename parser (backend re-parses and is the
// authority; this is only for the pre-upload preview).
const parseFilename = (name) => {
  const base = String(name || '').replace(/\.[^.]+$/, '');
  const codeMatch = base.match(/P\d{3,}/i);
  const code = codeMatch ? codeMatch[0].toUpperCase() : null;
  const norm = ' ' + base.toLowerCase().replace(/[_\-.]+/g, ' ') + ' ';
  let type = null;
  if (/aadhaar|aadhar|adhaar|adhar/.test(norm)) type = 'aadhaar';
  else if (/ pan | pan card |pancard/.test(norm)) type = 'pan';
  else if (/ photo | pic | image | dp |photo/.test(norm)) type = 'photo';
  return { code, type };
};

const TYPE_LABEL = { aadhaar: 'Aadhaar', pan: 'PAN', photo: 'Photo' };

const BulkDocumentUpload = ({ onBack }) => {
  const [employees, setEmployees] = useState([]);
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await employeeService.getAllEmployees({ limit: 500 });
        if (res.success) setEmployees(res.data);
      } catch {
        toast.error('Failed to load employee list');
      }
    };
    load();
  }, []);

  const byCode = useMemo(() => {
    const m = new Map();
    employees.forEach((e) => m.set(String(e.employee_code).toUpperCase(), e));
    return m;
  }, [employees]);

  // Build the preview rows with a status per file
  const rows = useMemo(() => {
    const seen = new Set();
    return files.map((file) => {
      const { code, type } = parseFilename(file.name);
      const emp = code ? byCode.get(code) : null;
      let status, note;
      if (!code && !type) { status = 'error'; note = 'No employee code or document type in filename'; }
      else if (!code) { status = 'error'; note = 'No employee code (e.g. P0012) in filename'; }
      else if (!type) { status = 'error'; note = 'No document type (aadhaar / pan / photo) in filename'; }
      else if (!emp) { status = 'error'; note = `No employee with code ${code}`; }
      else {
        const key = `${code}|${type}`;
        if (seen.has(key)) { status = 'warn'; note = `Duplicate ${TYPE_LABEL[type]} for ${code} in this batch`; }
        else { seen.add(key); status = 'ready'; note = ''; }
      }
      return { file, code, type, employee: emp ? `${emp.first_name} ${emp.last_name || ''}`.trim() : null, status, note };
    });
  }, [files, byCode]);

  const readyCount = rows.filter((r) => r.status === 'ready').length;
  const problemCount = rows.length - readyCount;

  const handleFiles = (e) => {
    setResults(null);
    setFiles(Array.from(e.target.files || []));
  };

  const handleUpload = async () => {
    if (readyCount === 0) return;
    setUploading(true);
    setResults(null);
    try {
      // Send all selected files; backend re-validates and skips the bad ones
      const res = await employeeService.bulkUploadDocuments(files);
      setResults(res);
      toast.success(res.message || 'Upload complete');
      setFiles([]);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Bulk upload failed');
    } finally {
      setUploading(false);
    }
  };

  const statusBadge = (status) => {
    if (status === 'ready') return 'bg-green-100 text-green-700';
    if (status === 'warn') return 'bg-amber-100 text-amber-700';
    return 'bg-red-100 text-red-700';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-slate-800">Bulk Document Upload</h2>
          {onBack && (
            <button onClick={onBack} className="text-slate-500 hover:text-slate-700 text-sm">← Back to Employees</button>
          )}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-slate-700 mb-5">
          <p className="font-semibold mb-1">How to name your files</p>
          <p>Start each file with the employee code, then the document type:</p>
          <ul className="list-disc ml-5 mt-1 text-slate-600">
            <li><code>P0012_aadhaar.jpg</code>, <code>P0012_pan.pdf</code>, <code>P0012_photo.jpg</code></li>
            <li>Spaces or dashes work too: <code>P0012 pan card.pdf</code></li>
          </ul>
          <p className="mt-2">You'll see a preview below and can review every match before anything is saved.</p>
        </div>

        <label className="block">
          <span className="sr-only">Choose files</span>
          <input
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleFiles}
            className="block w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 cursor-pointer"
          />
        </label>
      </div>

      {rows.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-700">
              Preview: {readyCount} ready{problemCount > 0 ? `, ${problemCount} need attention` : ''}
            </h3>
            <button
              onClick={handleUpload}
              disabled={uploading || readyCount === 0}
              className="px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
            >
              {uploading ? 'Uploading…' : `Upload ${readyCount} matched file${readyCount === 1 ? '' : 's'}`}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b">
                  <th className="py-2 pr-4">File</th>
                  <th className="py-2 pr-4">Employee</th>
                  <th className="py-2 pr-4">Type</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-2 pr-4 text-slate-700 break-all">{r.file.name}</td>
                    <td className="py-2 pr-4">
                      {r.employee ? (
                        <span className="text-slate-800">{r.code} — {r.employee}</span>
                      ) : (
                        <span className="text-slate-400">{r.code || '—'}</span>
                      )}
                    </td>
                    <td className="py-2 pr-4">{r.type ? TYPE_LABEL[r.type] : '—'}</td>
                    <td className="py-2">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${statusBadge(r.status)}`}>
                        {r.status === 'ready' ? 'Ready' : r.note}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {problemCount > 0 && (
            <p className="text-xs text-slate-500 mt-3">
              Only the {readyCount} “Ready” file{readyCount === 1 ? '' : 's'} will be uploaded. Fix the filenames of the others and select them again.
            </p>
          )}
        </div>
      )}

      {results && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <h3 className="font-semibold text-slate-700 mb-3">
            Result: {results.summary?.uploaded ?? 0} attached, {results.summary?.skipped ?? 0} skipped
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <tbody>
                {(results.results || []).map((r, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-2 pr-4 text-slate-700 break-all">{r.file}</td>
                    <td className="py-2 pr-4 text-slate-600">{r.employee || r.code || '—'}</td>
                    <td className="py-2">
                      {r.status === 'uploaded' ? (
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">Attached ({TYPE_LABEL[r.type] || r.type})</span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700">{r.reason}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkDocumentUpload;
