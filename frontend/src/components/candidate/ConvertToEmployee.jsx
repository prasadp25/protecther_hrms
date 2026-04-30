import { useState } from 'react';
import { candidateService } from '../../services/candidateService';

const ConvertToEmployee = ({ candidate, onSuccess, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    aadhaar_no: candidate?.aadhaar_no || '',
    pan_no: candidate?.pan_no || '',
    date_of_joining: candidate?.expected_joining_date ? candidate.expected_joining_date.split('T')[0] : '',
    emergency_contact_name: '',
    emergency_contact_mobile: '',
    emergency_contact_relationship: '',
    account_number: '',
    ifsc_code: '',
    bank_name: '',
    branch_name: ''
  });
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.aadhaar_no || formData.aadhaar_no.length !== 12) newErrors.aadhaar_no = 'Valid 12-digit Aadhaar required';
    if (!formData.pan_no || !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(formData.pan_no)) newErrors.pan_no = 'Valid PAN required (e.g., ABCDE1234F)';
    if (!formData.date_of_joining) newErrors.date_of_joining = 'Joining date is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const response = await candidateService.convertToEmployee(candidate.candidate_id, formData);
      if (response.success) {
        alert('Candidate converted to Employee successfully! Employee Code: ' + response.data.employee_code);
        onSuccess();
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to convert candidate');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount || 0);
  const inputClass = 'w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500';
  const errorInputClass = 'w-full px-3 py-2 border border-red-500 rounded-lg focus:ring-2 focus:ring-red-500';

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-800">Convert to Employee</h2>
          <button onClick={onCancel} className="text-slate-500 hover:text-slate-700 text-2xl">&times;</button>
        </div>

        <div className="bg-purple-50 p-4 rounded-lg mb-6">
          <h3 className="font-semibold mb-3 text-purple-800">Converting Candidate</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p><span className="text-slate-600">Code:</span> <span className="font-medium">{candidate.candidate_code}</span></p>
              <p><span className="text-slate-600">Name:</span> <span className="font-medium">{candidate.first_name} {candidate.last_name}</span></p>
              <p><span className="text-slate-600">Position:</span> <span className="font-medium">{candidate.designation}</span></p>
            </div>
            <div>
              <p><span className="text-slate-600">Department:</span> <span className="font-medium">{candidate.department}</span></p>
              <p><span className="text-slate-600">CTC:</span> <span className="font-bold text-blue-600">{formatCurrency(candidate.ctc)}</span></p>
              <p><span className="text-slate-600">Net Salary:</span> <span className="font-bold text-green-600">{formatCurrency(candidate.net_salary)}</span></p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="border-b pb-2">
            <h3 className="text-lg font-semibold text-slate-700">Required Details for Employee Record</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Aadhaar Number *</label>
              <input type="text" name="aadhaar_no" value={formData.aadhaar_no} onChange={handleChange} maxLength={12} className={errors.aadhaar_no ? errorInputClass : inputClass} placeholder="12 digit Aadhaar" />
              {errors.aadhaar_no && <p className="text-red-500 text-xs mt-1">{errors.aadhaar_no}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">PAN Number *</label>
              <input type="text" name="pan_no" value={formData.pan_no} onChange={handleChange} maxLength={10} className={errors.pan_no ? errorInputClass : inputClass} placeholder="e.g., ABCDE1234F" style={{ textTransform: 'uppercase' }} />
              {errors.pan_no && <p className="text-red-500 text-xs mt-1">{errors.pan_no}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Date of Joining *</label>
              <input type="date" name="date_of_joining" value={formData.date_of_joining} onChange={handleChange} className={errors.date_of_joining ? errorInputClass : inputClass} />
              {errors.date_of_joining && <p className="text-red-500 text-xs mt-1">{errors.date_of_joining}</p>}
            </div>
          </div>

          <div className="border-b pb-2 pt-4">
            <h3 className="text-lg font-semibold text-slate-700">Emergency Contact</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><label className="block text-sm font-medium mb-1">Contact Name</label><input type="text" name="emergency_contact_name" value={formData.emergency_contact_name} onChange={handleChange} className={inputClass} /></div>
            <div><label className="block text-sm font-medium mb-1">Contact Mobile</label><input type="text" name="emergency_contact_mobile" value={formData.emergency_contact_mobile} onChange={handleChange} className={inputClass} /></div>
            <div><label className="block text-sm font-medium mb-1">Relationship</label><input type="text" name="emergency_contact_relationship" value={formData.emergency_contact_relationship} onChange={handleChange} className={inputClass} placeholder="e.g., Father, Mother, Spouse" /></div>
          </div>

          <div className="border-b pb-2 pt-4">
            <h3 className="text-lg font-semibold text-slate-700">Bank Details (Optional)</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium mb-1">Account Number</label><input type="text" name="account_number" value={formData.account_number} onChange={handleChange} className={inputClass} /></div>
            <div><label className="block text-sm font-medium mb-1">IFSC Code</label><input type="text" name="ifsc_code" value={formData.ifsc_code} onChange={handleChange} className={inputClass} style={{ textTransform: 'uppercase' }} /></div>
            <div><label className="block text-sm font-medium mb-1">Bank Name</label><input type="text" name="bank_name" value={formData.bank_name} onChange={handleChange} className={inputClass} /></div>
            <div><label className="block text-sm font-medium mb-1">Branch Name</label><input type="text" name="branch_name" value={formData.branch_name} onChange={handleChange} className={inputClass} /></div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
            <p className="text-yellow-800 text-sm">
              <strong>Note:</strong> Converting this candidate will:
              <ul className="list-disc ml-5 mt-2">
                <li>Create a new Employee record with code (auto-generated)</li>
                <li>Copy all personal and salary details from candidate</li>
                <li>Create an active salary structure for the employee</li>
                <li>Mark candidate status as CONVERTED</li>
              </ul>
            </p>
          </div>

          <div className="flex justify-end gap-4 pt-4">
            <button type="button" onClick={onCancel} className="px-6 py-2.5 border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={loading} className="px-6 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2">
              {loading ? 'Converting...' : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                  Convert to Employee
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ConvertToEmployee;
