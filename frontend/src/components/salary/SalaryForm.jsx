import { useState, useEffect } from 'react';
import { salaryService } from '../../services/salaryService';
import { employeeService } from '../../services/employeeService';

// Percentage split configurations
// HRA is calculated as percentage of Basic, not Gross
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

const SalaryForm = ({ salaryId, onSuccess, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  // Backward calculation state
  const [ctcAmount, setCtcAmount] = useState(0);
  const [splitType, setSplitType] = useState('40-40');
  const [ptState, setPtState] = useState('maharashtra');
  const [isComponentsEdited, setIsComponentsEdited] = useState(false);

  const [formData, setFormData] = useState({
    employeeId: '',
    employeeCode: '',
    employeeName: '',
    effectiveFrom: new Date().toISOString().split('T')[0],
    entryMode: 'backward', // Track calculation method
    // Earnings
    basicSalary: 0,
    hra: 0,
    incentiveAllowance: 0,
    // Deductions
    pfDeduction: 0,
    esiDeduction: 0,
    professionalTax: 200,
    mediclaimDeduction: 0,
    advanceDeduction: 0,
    otherDeductions: 0,
  });

  useEffect(() => {
    loadEmployees();
    if (salaryId) {
      loadSalary();
    }
  }, [salaryId]);

  const loadEmployees = async () => {
    try {
      const response = await employeeService.getActiveEmployees();
      if (response.success) {
        setEmployees(response.data);
      }
    } catch (error) {
      console.error('Failed to load employees:', error);
    }
  };

  const loadSalary = async () => {
    try {
      setLoading(true);
      const response = await salaryService.getSalaryById(salaryId);
      if (response.success) {
        const data = response.data;
        // Convert snake_case from backend to camelCase for frontend
        setFormData({
          employeeId: data.employee_id,
          employeeCode: data.employee_code,
          employeeName: `${data.first_name} ${data.last_name}`,
          effectiveFrom: data.effective_from ? data.effective_from.split('T')[0] : new Date().toISOString().split('T')[0],
          basicSalary: parseFloat(data.basic_salary) || 0,
          hra: parseFloat(data.hra) || 0,
          incentiveAllowance: parseFloat(data.incentive_allowance) || 0,
          pfDeduction: parseFloat(data.pf_deduction) || 0,
          esiDeduction: parseFloat(data.esi_deduction) || 0,
          professionalTax: parseFloat(data.professional_tax) || 0,
          mediclaimDeduction: parseFloat(data.mediclaim_deduction) || 0,
          advanceDeduction: parseFloat(data.advance_deduction) || 0,
          otherDeductions: parseFloat(data.other_deductions) || 0,
        });
        setSelectedEmployee({
          employee_id: data.employee_id,
          employee_code: data.employee_code,
          first_name: data.first_name,
          last_name: data.last_name,
        });
      }
    } catch (error) {
      alert('Failed to load salary data');
    } finally {
      setLoading(false);
    }
  };

  const handleEmployeeSelect = (e) => {
    const employeeId = parseInt(e.target.value);
    const employee = employees.find((emp) => emp.employee_id === employeeId);

    if (employee) {
      setSelectedEmployee(employee);
      setFormData((prev) => ({
        ...prev,
        employeeId: employee.employee_id,
        employeeCode: employee.employee_code,
        employeeName: `${employee.first_name} ${employee.last_name}`,
      }));
    }
  };

  // Backward calculation: CTC → Components
  const calculateFromCTC = (ctc, split, state) => {
    if (ctc <= 0) return;

    const splitConfig = SPLIT_OPTIONS[split];
    const gross = ctc; // CTC = Gross in this context

    // Calculate earnings based on split percentages
    // Basic is percentage of Gross
    const basic = Math.round((gross * splitConfig.basic) / 100);
    // HRA is percentage of Basic (not Gross!)
    const hra = Math.round((basic * splitConfig.hraOfBasic) / 100);
    const incentive = gross - basic - hra; // Remaining goes to incentive

    // Calculate PF: IF Basic >= 15000 THEN 1800, ELSE 12%
    const pf = basic >= 15000 ? 1800 : Math.round(basic * 0.12);

    // Calculate ESI: 0.75% if gross < 21000
    const esi = gross < 21000 ? Math.round(gross * 0.0075) : 0;

    // Calculate PT based on state
    const pt = PT_RULES[state].calculate(gross);

    setFormData(prev => ({
      ...prev,
      basicSalary: basic,
      hra: hra,
      incentiveAllowance: incentive,
      pfDeduction: pf,
      esiDeduction: esi,
      professionalTax: pt,
      entryMode: 'backward',
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
    const numValue = parseFloat(value) || 0;

    // Mark components as manually edited
    const earningFields = ['basicSalary', 'hra', 'incentiveAllowance'];
    if (earningFields.includes(name)) {
      setIsComponentsEdited(true);
      setFormData(prev => ({ ...prev, entryMode: 'manual' }));
    }

    setFormData((prev) => {
      const newData = {
        ...prev,
        [name]: name === 'effectiveFrom' ? value : numValue,
      };

      // Auto-calculate PF based on Basic Salary
      if (name === 'basicSalary') {
        if (numValue >= 15000) {
          newData.pfDeduction = 1800;
        } else {
          newData.pfDeduction = Math.round(numValue * 0.12);
        }
      }

      // Auto-calculate ESIC (0.75% of gross) if gross < 21000
      if (earningFields.includes(name)) {
        const basic = name === 'basicSalary' ? numValue : newData.basicSalary;
        const hra = name === 'hra' ? numValue : newData.hra;
        const incentive = name === 'incentiveAllowance' ? numValue : newData.incentiveAllowance;
        const grossSalary = basic + hra + incentive;

        if (grossSalary < 21000) {
          newData.esiDeduction = Math.round(grossSalary * 0.0075);
        } else {
          newData.esiDeduction = 0;
        }

        // Also update PT based on state when components change
        newData.professionalTax = PT_RULES[ptState].calculate(grossSalary);
      }

      return newData;
    });

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const calculateTotals = () => {
    const grossSalary =
      formData.basicSalary +
      formData.hra +
      formData.incentiveAllowance;

    const totalDeductions =
      formData.pfDeduction +
      formData.esiDeduction +
      formData.professionalTax +
      formData.mediclaimDeduction +
      formData.advanceDeduction +
      formData.otherDeductions;

    const netSalary = grossSalary - totalDeductions;

    return { grossSalary, totalDeductions, netSalary };
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.employeeId) {
      newErrors.employeeId = 'Please select an employee';
    }

    if (!formData.effectiveFrom) {
      newErrors.effectiveFrom = 'Effective date is required';
    }

    if (formData.basicSalary <= 0) {
      newErrors.basicSalary = 'Basic salary must be greater than 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      // Convert camelCase to snake_case for backend
      const salaryData = {
        employee_id: formData.employeeId,
        basic_salary: formData.basicSalary,
        hra: formData.hra,
        incentive_allowance: formData.incentiveAllowance,
        pf_deduction: formData.pfDeduction,
        esi_deduction: formData.esiDeduction,
        professional_tax: formData.professionalTax,
        mediclaim_deduction: formData.mediclaimDeduction,
        advance_deduction: formData.advanceDeduction,
        other_deductions: formData.otherDeductions,
        effective_from: formData.effectiveFrom,
        entry_mode: formData.entryMode,
        split_type: splitType,
        pt_state: ptState,
      };

      let response;

      if (salaryId) {
        response = await salaryService.updateSalary(salaryId, salaryData);
      } else {
        response = await salaryService.createSalary(salaryData);
      }

      if (response.success) {
        alert(response.message);
        if (onSuccess) onSuccess();
      }
    } catch (error) {
      if (error.response?.data?.message) {
        alert(error.response.data.message);
      } else if (error.response?.data?.errors) {
        setErrors(error.response.data.errors);
      } else {
        alert('Failed to save salary structure');
      }
    } finally {
      setLoading(false);
    }
  };

  const { grossSalary, totalDeductions, netSalary } = calculateTotals();

  const inputClasses =
    'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border';
  const labelClasses = 'block text-sm font-medium text-gray-700';
  const errorClasses = 'mt-1 text-sm text-red-600';

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        {salaryId ? 'Edit Salary Structure' : 'Add New Salary Structure'}
      </h2>

      {/* Employee Selection */}
      <div className="border-b pb-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Employee Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClasses}>Select Employee *</label>
            <select
              name="employeeId"
              value={formData.employeeId}
              onChange={handleEmployeeSelect}
              className={inputClasses}
              disabled={!!salaryId}
            >
              <option value="">-- Select Employee --</option>
              {employees.map((emp) => (
                <option key={emp.employee_id} value={emp.employee_id}>
                  {emp.employee_code} - {emp.first_name} {emp.last_name}
                </option>
              ))}
            </select>
            {errors.employeeId && <p className={errorClasses}>{errors.employeeId}</p>}
          </div>

          <div>
            <label className={labelClasses}>Effective From *</label>
            <input
              type="date"
              name="effectiveFrom"
              value={formData.effectiveFrom}
              onChange={handleChange}
              className={inputClasses}
            />
            {errors.effectiveFrom && <p className={errorClasses}>{errors.effectiveFrom}</p>}
          </div>
        </div>
      </div>

      {/* CTC Entry - Backward Calculation */}
      <div className="border-b pb-4 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Quick Entry (CTC to Components)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className={labelClasses}>Monthly CTC (Gross)</label>
            <input
              type="number"
              value={ctcAmount || ''}
              onChange={handleCTCChange}
              className={`${inputClasses} bg-white font-semibold text-lg`}
              min="0"
              placeholder="Enter CTC amount"
            />
          </div>

          <div>
            <label className={labelClasses}>Split Type</label>
            <select
              value={splitType}
              onChange={handleSplitChange}
              className={`${inputClasses} bg-white`}
            >
              {Object.entries(SPLIT_OPTIONS).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClasses}>PT State</label>
            <select
              value={ptState}
              onChange={handleStateChange}
              className={`${inputClasses} bg-white`}
            >
              {Object.entries(PT_RULES).map(([key, config]) => (
                <option key={key} value={key}>{config.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={handleRecalculate}
              className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
              disabled={ctcAmount <= 0}
            >
              Recalculate
            </button>
          </div>
        </div>

        {isComponentsEdited && (
          <div className="mt-3 p-2 bg-yellow-100 border border-yellow-300 rounded text-sm text-yellow-800">
            Components have been manually edited. Click "Recalculate" to reset from CTC.
          </div>
        )}

        {ctcAmount > 0 && !isComponentsEdited && (
          <div className="mt-3 text-sm text-green-700">
            Components auto-calculated from CTC. You can edit individual fields if needed.
          </div>
        )}
      </div>

      {/* Earnings */}
      <div className="border-b pb-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Earnings</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelClasses}>Basic Salary *</label>
            <input
              type="number"
              name="basicSalary"
              value={formData.basicSalary}
              onChange={handleChange}
              className={inputClasses}
              min="0"
              step="0.01"
            />
            {errors.basicSalary && <p className={errorClasses}>{errors.basicSalary}</p>}
          </div>

          <div>
            <label className={labelClasses}>HRA (House Rent Allowance)</label>
            <input
              type="number"
              name="hra"
              value={formData.hra || ''}
              onChange={handleChange}
              className={inputClasses}
              min="0"
              step="0.01"
            />
          </div>

          <div>
            <label className={labelClasses}>Incentive / Other Allowances</label>
            <input
              type="number"
              name="incentiveAllowance"
              value={formData.incentiveAllowance || ''}
              onChange={handleChange}
              className={inputClasses}
              min="0"
              step="0.01"
            />
          </div>
        </div>
      </div>

      {/* Deductions */}
      <div className="border-b pb-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Deductions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelClasses}>
              PF Deduction (≥15000: 1800, &lt;15000: 12%)
            </label>
            <input
              type="number"
              name="pfDeduction"
              value={formData.pfDeduction || ''}
              onChange={handleChange}
              className={inputClasses}
              min="0"
              step="0.01"
              readOnly
              title="Auto-calculated based on Basic Salary"
            />
          </div>

          <div>
            <label className={labelClasses}>ESI Deduction (0.75% if Gross &lt; 21000)</label>
            <input
              type="number"
              name="esiDeduction"
              value={formData.esiDeduction || ''}
              onChange={handleChange}
              className={inputClasses}
              min="0"
              step="0.01"
              readOnly
              title="Auto-calculated: 0.75% of Gross if Gross < 21,000"
            />
          </div>

          <div>
            <label className={labelClasses}>Professional Tax (PT)</label>
            <input
              type="number"
              name="professionalTax"
              value={formData.professionalTax || ''}
              onChange={handleChange}
              className={inputClasses}
              min="0"
              step="0.01"
            />
          </div>

          <div>
            <label className={labelClasses}>Mediclaim</label>
            <input
              type="number"
              name="mediclaimDeduction"
              value={formData.mediclaimDeduction || ''}
              onChange={handleChange}
              className={inputClasses}
              min="0"
              step="0.01"
            />
          </div>

          <div>
            <label className={labelClasses}>Advance Deduction</label>
            <input
              type="number"
              name="advanceDeduction"
              value={formData.advanceDeduction || ''}
              onChange={handleChange}
              className={inputClasses}
              min="0"
              step="0.01"
            />
          </div>

          <div>
            <label className={labelClasses}>Other Deductions</label>
            <input
              type="number"
              name="otherDeductions"
              value={formData.otherDeductions || ''}
              onChange={handleChange}
              className={inputClasses}
              min="0"
              step="0.01"
            />
          </div>
        </div>

        {/* Other Deductions Remarks */}
        <div className="mt-4">
          <label className={labelClasses}>Other Deductions Remarks</label>
          <textarea
            name="otherDeductionsRemarks"
            value={formData.otherDeductionsRemarks || ''}
            onChange={handleChange}
            rows="3"
            className={inputClasses}
            placeholder="Enter remarks for other deductions..."
          />
        </div>
      </div>

      {/* Salary Summary */}
      <div className="bg-blue-50 p-6 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Salary Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="text-sm text-gray-600">Gross Salary</div>
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(grossSalary)}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Total Deductions</div>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(totalDeductions)}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Net Salary</div>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(netSalary)}</div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-4 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          disabled={loading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300"
          disabled={loading}
        >
          {loading ? 'Saving...' : salaryId ? 'Update Salary' : 'Create Salary'}
        </button>
      </div>
    </form>
  );
};

export default SalaryForm;
