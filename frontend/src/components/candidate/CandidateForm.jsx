import { useState, useEffect } from 'react';
import { candidateService } from '../../services/candidateService';
import { siteService } from '../../services/siteService';
import { employeeService } from '../../services/employeeService';

// Percentage split configurations (same as SalaryForm)
const SPLIT_OPTIONS = {
  'high-basic': { basic: 87.11, hraOfBasic: 5, label: 'High Basic (87.11%) - Best for PF' },
  '40-40': { basic: 40, hraOfBasic: 40, label: '40% Basic, HRA 40% of Basic' },
  '50-40': { basic: 50, hraOfBasic: 40, label: '50% Basic, HRA 40% of Basic' },
};

// State-wise Professional Tax rules (monthly)
const PT_RULES = {
  maharashtra: { name: 'Maharashtra', calculate: (gross) => gross > 10000 ? 200 : gross > 7500 ? 175 : 0 },
  karnataka: { name: 'Karnataka', calculate: (gross) => gross > 15000 ? 200 : gross > 10000 ? 150 : 0 },
  gujarat: { name: 'Gujarat', calculate: (gross) => gross > 12000 ? 200 : gross > 9000 ? 150 : 0 },
  tamilnadu: { name: 'Tamil Nadu', calculate: (gross) => gross > 21000 ? 208 : gross > 15000 ? 180 : 0 },
  westbengal: { name: 'West Bengal', calculate: (gross) => gross > 10000 ? 200 : gross > 6000 ? 150 : 0 },
  custom: { name: 'Custom (Manual Entry)', calculate: () => 0 },
};

// Predefined departments (always available)
const DEFAULT_DEPARTMENTS = [
  'Accounts',
  'Administration',
  'HR',
  'IT',
  'Operations',
  'Safety',
  'Security',
  'Support',
];

// Predefined designations (always available)
const DEFAULT_DESIGNATIONS = [
  'Accounts Executive',
  'Admin Executive',
  'HR Executive',
  'IT Support',
  'Office Assistant',
  'Project Manager',
  'Safety Officer',
  'Safety Steward',
  'Safety Supervisor',
  'Scaffolding Inspector',
  'Security Guard',
  'Security Supervisor',
  'Site Engineer',
  'Site Supervisor',
];

const CandidateForm = ({ candidate, onSuccess, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [sites, setSites] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const isEdit = !!candidate;

  // Auto-calculator state
  const [ctcAmount, setCtcAmount] = useState(0);
  const [splitType, setSplitType] = useState('40-40');
  const [ptState, setPtState] = useState('maharashtra');
  const [isComponentsEdited, setIsComponentsEdited] = useState(false);

  const [formData, setFormData] = useState({
    first_name: '', last_name: '', gender: 'Male', mobile: '', email: '',
    dob: '', address: '', city: '', state: '', pincode: '',
    designation: '', department: '', site_id: '', expected_joining_date: '',
    reporting_manager: '', basic_salary: '', hra: '', conveyance_allowance: '',
    other_allowances: '', bonus: '', gratuity: '', pf_deduction: '1800', pt_deduction: '200',
    mediclaim_deduction: '', probation_period: '6', notice_period: '15', remarks: '',
    status: 'PENDING'
  });

  useEffect(() => {
    loadSites();
    loadDepartments();
    loadDesignations();
  }, []);

  useEffect(() => {
    if (candidate) {
      setFormData({
        first_name: candidate.first_name || '', last_name: candidate.last_name || '',
        gender: candidate.gender || 'Male', mobile: candidate.mobile || '',
        email: candidate.email || '', dob: candidate.dob ? candidate.dob.split('T')[0] : '',
        address: candidate.address || '', city: candidate.city || '',
        state: candidate.state || '', pincode: candidate.pincode || '',
        designation: candidate.designation || '', department: candidate.department || '',
        site_id: candidate.site_id || '',
        expected_joining_date: candidate.expected_joining_date ? candidate.expected_joining_date.split('T')[0] : '',
        reporting_manager: candidate.reporting_manager || '',
        basic_salary: candidate.basic_salary || '', hra: candidate.hra || '',
        conveyance_allowance: candidate.conveyance_allowance || '',
        other_allowances: candidate.other_allowances || '',
        pf_deduction: candidate.pf_deduction || '1800', pt_deduction: candidate.pt_deduction || '200',
        mediclaim_deduction: candidate.mediclaim_deduction || '',
        probation_period: candidate.probation_period || '6',
        notice_period: candidate.notice_period || '15', remarks: candidate.remarks || '',
        status: candidate.status || 'PENDING'
      });
      // Set CTC from existing gross for editing
      if (candidate.gross_salary) {
        setCtcAmount(parseFloat(candidate.gross_salary) || 0);
        setIsComponentsEdited(true); // Mark as edited since values exist
      }
    }
  }, [candidate]);

  const loadSites = async () => {
    try {
      const response = await siteService.getActiveSites();
      if (response.success) setSites(response.data || []);
    } catch (error) { console.error('Failed to load sites:', error); }
  };

  const loadDepartments = async () => {
    try {
      const response = await employeeService.getDepartments();
      const apiDepts = response.success ? (response.data || []) : [];
      // Merge API departments with defaults, remove duplicates, sort
      const merged = [...new Set([...DEFAULT_DEPARTMENTS, ...apiDepts])].sort();
      setDepartments(merged);
    } catch (error) {
      console.error('Failed to load departments:', error);
      setDepartments(DEFAULT_DEPARTMENTS);
    }
  };

  const loadDesignations = async () => {
    try {
      const response = await employeeService.getDesignations();
      const apiDesigs = response.success ? (response.data || []) : [];
      // Merge API designations with defaults, remove duplicates, sort
      const merged = [...new Set([...DEFAULT_DESIGNATIONS, ...apiDesigs])].sort();
      setDesignations(merged);
    } catch (error) {
      console.error('Failed to load designations:', error);
      setDesignations(DEFAULT_DESIGNATIONS);
    }
  };

  // Calculate bonus as per Payment of Bonus Act 1965
  // 8.33% of min(basic, 7000) if basic <= 21000
  const calculateBonus = (basic) => {
    if (basic > 21000) return 0;
    const bonusBase = Math.min(basic, 7000);
    return Math.round(bonusBase * 0.0833);
  };

  // Calculate gratuity as per Payment of Gratuity Act 1972
  // 4.81% of Basic (Formula: Basic × 15 / 26 / 12)
  const calculateGratuity = (basic) => {
    return Math.round(basic * 0.0481);
  };

  // Auto-calculate from CTC (same logic as SalaryForm)
  // Bonus and Gratuity are INCLUDED in CTC, carved out from Other Allowances
  const calculateFromCTC = (ctc, split, state) => {
    if (ctc <= 0) return;

    const splitConfig = SPLIT_OPTIONS[split];
    const gross = ctc;

    // Calculate earnings based on split percentages
    const basic = Math.round((gross * splitConfig.basic) / 100);
    const hra = Math.round((basic * splitConfig.hraOfBasic) / 100);
    const conveyance = 0; // Can be manually added

    // Calculate bonus and gratuity (included in CTC, not extra)
    const bonus = calculateBonus(basic);
    const gratuity = calculateGratuity(basic);

    // Other allowances = Remaining MINUS bonus and gratuity (both carved out)
    const other = gross - basic - hra - conveyance - bonus - gratuity;

    // Calculate PF: IF Basic >= 15000 THEN 1800, ELSE 12%
    const pf = basic >= 15000 ? 1800 : Math.round(basic * 0.12);

    // Calculate PT based on state
    const pt = PT_RULES[state].calculate(gross);

    setFormData(prev => ({
      ...prev,
      basic_salary: basic,
      hra: hra,
      conveyance_allowance: conveyance,
      other_allowances: other,
      bonus: bonus,
      gratuity: gratuity,
      pf_deduction: pf,
      pt_deduction: pt,
    }));

    setIsComponentsEdited(false);
  };

  // Handle CTC change
  const handleCTCChange = (e) => {
    const ctc = parseFloat(e.target.value) || 0;
    setCtcAmount(ctc);
    if (!isComponentsEdited) {
      calculateFromCTC(ctc, splitType, ptState);
    }
  };

  // Handle split type change
  const handleSplitChange = (e) => {
    const newSplit = e.target.value;
    setSplitType(newSplit);
    if (ctcAmount > 0 && !isComponentsEdited) {
      calculateFromCTC(ctcAmount, newSplit, ptState);
    }
  };

  // Handle state change for PT
  const handleStateChange = (e) => {
    const newState = e.target.value;
    setPtState(newState);
    if (ctcAmount > 0 && !isComponentsEdited) {
      calculateFromCTC(ctcAmount, splitType, newState);
    }
  };

  // Recalculate from current CTC
  const handleRecalculate = () => {
    if (ctcAmount > 0) {
      calculateFromCTC(ctcAmount, splitType, ptState);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Mark salary components as manually edited
    const salaryFields = ['basic_salary', 'hra', 'conveyance_allowance', 'other_allowances'];
    if (salaryFields.includes(name)) {
      setIsComponentsEdited(true);
    }

    setFormData(prev => {
      const newData = { ...prev, [name]: value };

      // Auto-calculate PF, Bonus, and Gratuity based on Basic Salary
      if (name === 'basic_salary') {
        const basic = parseFloat(value) || 0;
        newData.pf_deduction = basic >= 15000 ? 1800 : Math.round(basic * 0.12);
        // Recalculate bonus and gratuity when basic changes
        newData.bonus = calculateBonus(basic);
        newData.gratuity = calculateGratuity(basic);
      }

      // Update PT based on state when salary components change
      if (salaryFields.includes(name)) {
        const basic = name === 'basic_salary' ? (parseFloat(value) || 0) : (parseFloat(newData.basic_salary) || 0);
        const hra = name === 'hra' ? (parseFloat(value) || 0) : (parseFloat(newData.hra) || 0);
        const conveyance = name === 'conveyance_allowance' ? (parseFloat(value) || 0) : (parseFloat(newData.conveyance_allowance) || 0);
        const other = name === 'other_allowances' ? (parseFloat(value) || 0) : (parseFloat(newData.other_allowances) || 0);
        const bonusAmt = parseFloat(newData.bonus) || 0;
        const gratuityAmt = parseFloat(newData.gratuity) || 0;
        // Gross includes bonus and gratuity
        const grossSalary = basic + hra + conveyance + other + bonusAmt + gratuityAmt;
        newData.pt_deduction = PT_RULES[ptState].calculate(grossSalary);
      }

      return newData;
    });
  };

  const calculateSalary = () => {
    const basic = parseFloat(formData.basic_salary) || 0;
    const hra = parseFloat(formData.hra) || 0;
    const conveyance = parseFloat(formData.conveyance_allowance) || 0;
    const other = parseFloat(formData.other_allowances) || 0;
    const bonus = parseFloat(formData.bonus) || calculateBonus(basic);
    const gratuity = parseFloat(formData.gratuity) || calculateGratuity(basic);
    // Gross includes bonus and gratuity (both are part of CTC, not extra)
    const gross = basic + hra + conveyance + other + bonus + gratuity;
    const pf = parseFloat(formData.pf_deduction) || 0;
    const pt = parseFloat(formData.pt_deduction) || 0;
    const mediclaim = parseFloat(formData.mediclaim_deduction) || 0;
    const totalDeductions = pf + pt + mediclaim;
    return { gross, totalDeductions, net: gross - totalDeductions, bonus, gratuity, ctc: (gross * 12) + (pf * 12) };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.first_name || !formData.mobile || !formData.designation || !formData.department || !formData.basic_salary) {
      alert('Please fill required fields'); return;
    }
    setLoading(true);
    try {
      const response = isEdit
        ? await candidateService.updateCandidate(candidate.candidate_id, formData)
        : await candidateService.createCandidate(formData);
      if (response.success) { alert(response.message); onSuccess(); }
    } catch (error) { alert('Failed to save candidate'); }
    finally { setLoading(false); }
  };

  const formatCurrency = (amount) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
  const { gross, totalDeductions, net, bonus, gratuity, ctc } = calculateSalary();
  const inputClass = 'w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500';

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-800">{isEdit ? 'Edit Candidate' : 'Add New Candidate'}</h2>
          <button onClick={onCancel} className="text-slate-500 hover:text-slate-700 text-2xl">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <h3 className="text-lg font-semibold border-b pb-2">Personal Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><label className="block text-sm font-medium mb-1">First Name *</label><input type="text" name="first_name" value={formData.first_name} onChange={handleChange} className={inputClass} required /></div>
            <div><label className="block text-sm font-medium mb-1">Last Name *</label><input type="text" name="last_name" value={formData.last_name} onChange={handleChange} className={inputClass} required /></div>
            <div><label className="block text-sm font-medium mb-1">Gender</label><select name="gender" value={formData.gender} onChange={handleChange} className={inputClass}><option>Male</option><option>Female</option><option>Other</option></select></div>
            <div><label className="block text-sm font-medium mb-1">Mobile *</label><input type="text" name="mobile" value={formData.mobile} onChange={handleChange} className={inputClass} required /></div>
            <div><label className="block text-sm font-medium mb-1">Email</label><input type="email" name="email" value={formData.email} onChange={handleChange} className={inputClass} /></div>
            <div><label className="block text-sm font-medium mb-1">DOB</label><input type="date" name="dob" value={formData.dob} onChange={handleChange} className={inputClass} /></div>
          </div>
          <div><label className="block text-sm font-medium mb-1">Address</label><textarea name="address" value={formData.address} onChange={handleChange} rows={2} className={inputClass} /></div>
          <div className="grid grid-cols-3 gap-4">
            <div><label className="block text-sm font-medium mb-1">City</label><input type="text" name="city" value={formData.city} onChange={handleChange} className={inputClass} /></div>
            <div><label className="block text-sm font-medium mb-1">State</label><input type="text" name="state" value={formData.state} onChange={handleChange} className={inputClass} /></div>
            <div><label className="block text-sm font-medium mb-1">Pincode</label><input type="text" name="pincode" value={formData.pincode} onChange={handleChange} className={inputClass} /></div>
          </div>

          <h3 className="text-lg font-semibold border-b pb-2 pt-4">Position Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Designation *</label>
              <select name="designation" value={formData.designation} onChange={handleChange} className={inputClass} required>
                <option value="">Select Designation</option>
                {designations.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Department *</label>
              <select name="department" value={formData.department} onChange={handleChange} className={inputClass} required>
                <option value="">Select Department</option>
                {departments.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div><label className="block text-sm font-medium mb-1">Site</label><select name="site_id" value={formData.site_id} onChange={handleChange} className={inputClass}><option value="">Select</option>{sites.map(s => <option key={s.site_id} value={s.site_id}>{s.site_name}</option>)}</select></div>
            <div><label className="block text-sm font-medium mb-1">Expected Joining</label><input type="date" name="expected_joining_date" value={formData.expected_joining_date} onChange={handleChange} className={inputClass} /></div>
            <div><label className="block text-sm font-medium mb-1">Reporting Manager</label><input type="text" name="reporting_manager" value={formData.reporting_manager} onChange={handleChange} className={inputClass} /></div>
            {isEdit && formData.status !== 'CONVERTED' && (
              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <select name="status" value={formData.status} onChange={handleChange} className={inputClass + (formData.status === 'ACCEPTED' ? ' bg-green-50 border-green-300' : formData.status === 'REJECTED' ? ' bg-red-50 border-red-300' : '')}>
                  <option value="PENDING">Pending</option>
                  <option value="OFFERED">Offered</option>
                  <option value="ACCEPTED">Accepted</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="NEGOTIATING">Negotiating</option>
                </select>
              </div>
            )}
          </div>

          {/* Quick Entry - CTC Calculator */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-100 mt-4">
            <h3 className="text-lg font-semibold text-slate-700 mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              Quick Entry (CTC to Components)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Monthly CTC (Gross)</label>
                <input type="number" value={ctcAmount || ''} onChange={handleCTCChange} className={inputClass + ' bg-white font-semibold'} min="0" placeholder="Enter CTC amount" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Split Type</label>
                <select value={splitType} onChange={handleSplitChange} className={inputClass + ' bg-white'}>
                  {Object.entries(SPLIT_OPTIONS).map(([key, config]) => (
                    <option key={key} value={key}>{config.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">PT State</label>
                <select value={ptState} onChange={handleStateChange} className={inputClass + ' bg-white'}>
                  {Object.entries(PT_RULES).map(([key, config]) => (
                    <option key={key} value={key}>{config.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button type="button" onClick={handleRecalculate} disabled={ctcAmount <= 0} className="w-full px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50">
                  Recalculate
                </button>
              </div>
            </div>
            {isComponentsEdited && ctcAmount > 0 && (
              <div className="mt-3 p-3 bg-yellow-100 border border-yellow-300 rounded-lg text-sm text-yellow-800">
                Components have been manually edited. Click "Recalculate" to reset from CTC.
              </div>
            )}
            {ctcAmount > 0 && !isComponentsEdited && (
              <div className="mt-3 text-sm text-green-700 font-medium">
                Components auto-calculated from CTC. You can edit individual fields if needed.
              </div>
            )}
          </div>

          <h3 className="text-lg font-semibold border-b pb-2 pt-4">Salary Structure (Monthly)</h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div><label className="block text-sm font-medium mb-1">Basic *</label><input type="number" name="basic_salary" value={formData.basic_salary} onChange={handleChange} className={inputClass} required /></div>
            <div><label className="block text-sm font-medium mb-1">HRA</label><input type="number" name="hra" value={formData.hra} onChange={handleChange} className={inputClass} /></div>
            <div><label className="block text-sm font-medium mb-1">Conveyance</label><input type="number" name="conveyance_allowance" value={formData.conveyance_allowance} onChange={handleChange} className={inputClass} /></div>
            <div><label className="block text-sm font-medium mb-1">Other Allowances</label><input type="number" name="other_allowances" value={formData.other_allowances} onChange={handleChange} className={inputClass} /></div>
            <div>
              <label className="block text-sm font-medium mb-1">Bonus (in CTC)</label>
              <input type="number" name="bonus" value={formData.bonus} className={inputClass + ' bg-green-50 text-green-700 font-semibold'} readOnly title="8.33% of min(Basic, ₹7000) - Included in CTC" />
              <p className="text-xs text-green-600 mt-1">8.33% (Part of CTC)</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Gratuity (in CTC)</label>
              <input type="number" name="gratuity" value={formData.gratuity} className={inputClass + ' bg-purple-50 text-purple-700 font-semibold'} readOnly title="4.81% of Basic - Included in CTC" />
              <p className="text-xs text-purple-600 mt-1">4.81% (Part of CTC)</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">PF (Auto-calculated)</label>
              <input type="number" name="pf_deduction" value={formData.pf_deduction} onChange={handleChange} className={inputClass + ' bg-slate-50'} readOnly title="Auto-calculated: Basic ≥15000: ₹1800, else 12%" />
              <p className="text-xs text-slate-500 mt-1">Basic ≥15000: ₹1800, else 12%</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">PT (Auto-calculated)</label>
              <input type="number" name="pt_deduction" value={formData.pt_deduction} onChange={handleChange} className={inputClass + ' bg-slate-50'} readOnly title="Auto-calculated based on PT State" />
            </div>
            <div><label className="block text-sm font-medium mb-1">Mediclaim</label><input type="number" name="mediclaim_deduction" value={formData.mediclaim_deduction} onChange={handleChange} className={inputClass} /></div>
          </div>
          <div className="bg-slate-50 p-4 rounded-lg grid grid-cols-6 gap-4 text-center">
            <div><p className="text-sm text-slate-500">Gross</p><p className="font-bold">{formatCurrency(gross)}</p></div>
            <div><p className="text-sm text-slate-500">Bonus</p><p className="font-bold text-green-600">{formatCurrency(bonus)}</p></div>
            <div><p className="text-sm text-slate-500">Gratuity</p><p className="font-bold text-purple-600">{formatCurrency(gratuity)}</p></div>
            <div><p className="text-sm text-slate-500">Deductions</p><p className="font-bold text-red-600">{formatCurrency(totalDeductions)}</p></div>
            <div><p className="text-sm text-slate-500">Net</p><p className="font-bold text-green-600">{formatCurrency(net)}</p></div>
            <div><p className="text-sm text-slate-500">CTC/Month</p><p className="font-bold text-blue-600">{formatCurrency(gross)}</p></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium mb-1">Probation (Months)</label><input type="number" name="probation_period" value={formData.probation_period} onChange={handleChange} className={inputClass} /></div>
            <div><label className="block text-sm font-medium mb-1">Notice (Days)</label><input type="number" name="notice_period" value={formData.notice_period} onChange={handleChange} className={inputClass} /></div>
          </div>
          <div><label className="block text-sm font-medium mb-1">Remarks</label><textarea name="remarks" value={formData.remarks} onChange={handleChange} rows={2} className={inputClass} /></div>
          <div className="flex justify-end gap-4 pt-4">
            <button type="button" onClick={onCancel} className="px-6 py-2 border rounded-lg hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={loading} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{loading ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CandidateForm;
