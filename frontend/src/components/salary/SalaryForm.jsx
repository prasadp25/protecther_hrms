import { useState, useEffect } from 'react';
import { salaryService } from '../../services/salaryService';
import { employeeService } from '../../services/employeeService';

const SalaryForm = ({ salaryId, onSuccess, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [formData, setFormData] = useState({
    employeeId: '',
    employeeCode: '',
    employeeName: '',
    effectiveFrom: new Date().toISOString().split('T')[0],
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
    remarks: '',
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
        setFormData(response.data);
        setSelectedEmployee({
          employeeId: response.data.employeeId,
          employeeName: response.data.employeeName,
          employeeCode: response.data.employeeCode,
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    const numValue = parseFloat(value) || 0;

    setFormData((prev) => {
      const newData = {
        ...prev,
        [name]: (name === 'effectiveFrom' || name === 'remarks') ? value : numValue,
      };

      // Auto-calculate PF based on Basic Salary
      // IF Basic >= 15000 THEN PF = 1800, ELSE PF = Basic * 12%
      if (name === 'basicSalary') {
        if (numValue >= 15000) {
          newData.pfDeduction = 1800;
        } else {
          newData.pfDeduction = Math.round(numValue * 0.12);
        }
      }

      // Auto-calculate ESIC (0.75% of gross) if gross < 21000
      if (name === 'basicSalary' || name === 'hra' || name === 'incentiveAllowance') {
        const basic = name === 'basicSalary' ? numValue : newData.basicSalary;
        const hra = name === 'hra' ? numValue : newData.hra;
        const incentive = name === 'incentiveAllowance' ? numValue : newData.incentiveAllowance;
        const grossSalary = basic + hra + incentive;

        if (grossSalary < 21000) {
          newData.esiDeduction = Math.round(grossSalary * 0.0075); // 0.75%
        } else {
          newData.esiDeduction = 0;
        }
      }

      return newData;
    });

    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
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
        remarks: formData.remarks
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
              PF Deduction (≥₹15000: ₹1800, &lt;₹15000: 12%)
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
            <label className={labelClasses}>ESI Deduction (0.75% if Gross &lt; ₹21000)</label>
            <input
              type="number"
              name="esiDeduction"
              value={formData.esiDeduction || ''}
              onChange={handleChange}
              className={inputClasses}
              min="0"
              step="0.01"
              readOnly
              title="Auto-calculated: 0.75% of Gross if Gross < ₹21,000"
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
            value={formData.otherDeductionsRemarks}
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
