import { useState, useEffect } from 'react';
import { salaryService } from '../../services/salaryService';

const SalaryList = ({ onEdit, onAddNew, onViewPayslips }) => {
  const [salaries, setSalaries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filteredSalaries, setFilteredSalaries] = useState([]);

  useEffect(() => {
    loadSalaries();
    loadSummary();
  }, []);

  useEffect(() => {
    filterSalaries();
  }, [salaries, searchKeyword]);

  const loadSalaries = async () => {
    try {
      setLoading(true);
      const response = await salaryService.getAllSalaries();
      if (response.success) {
        // Only show active salaries
        const activeSalaries = response.data.filter((sal) => sal.status === 'ACTIVE');
        setSalaries(activeSalaries);
      }
    } catch (error) {
      alert('Failed to load salary structures');
    } finally {
      setLoading(false);
    }
  };

  const loadSummary = async () => {
    try {
      const response = await salaryService.getSalarySummary();
      if (response.success) {
        setSummary(response.data);
      }
    } catch (error) {
      console.error('Failed to load summary:', error);
    }
  };

  const filterSalaries = () => {
    if (!searchKeyword.trim()) {
      setFilteredSalaries(salaries);
      return;
    }

    const keyword = searchKeyword.toLowerCase();
    const filtered = salaries.filter(
      (sal) =>
        sal.employeeName?.toLowerCase().includes(keyword) ||
        sal.employeeCode?.toLowerCase().includes(keyword)
    );
    setFilteredSalaries(filtered);
  };

  const handleDelete = async (salaryId, employeeName) => {
    if (window.confirm(`Are you sure you want to deactivate salary structure for ${employeeName}?`)) {
      try {
        const response = await salaryService.deleteSalary(salaryId);
        if (response.success) {
          alert(response.message);
          loadSalaries();
          loadSummary();
        }
      } catch (error) {
        alert('Failed to deactivate salary structure');
      }
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Salary Management</h2>
        <button
          onClick={onAddNew}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          + Add Salary Structure
        </button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Total Employees</div>
            <div className="text-2xl font-bold text-gray-900">{summary.totalEmployees}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Monthly Salary Burden</div>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(summary.totalSalaryBurden)}
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Average Salary</div>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(summary.avgSalary)}
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Salary Range</div>
            <div className="text-lg font-bold text-gray-900">
              {formatCurrency(summary.minSalary)} - {formatCurrency(summary.maxSalary)}
            </div>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="Search by employee name or code..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
          />
          <button
            onClick={onViewPayslips}
            className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            View Payslips
          </button>
        </div>
        <div className="mt-2 text-sm text-gray-600">
          Showing {filteredSalaries.length} of {salaries.length} salary structures
        </div>
      </div>

      {/* Salary Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Loading salary structures...</p>
          </div>
        ) : filteredSalaries.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">No salary structures found</p>
            <button
              onClick={onAddNew}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Add First Salary Structure
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Basic Salary
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Allowances
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Gross Salary
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Deductions
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Net Salary
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Effective From
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSalaries.map((salary) => {
                  const totalAllowances =
                    salary.hra +
                    salary.da +
                    salary.conveyanceAllowance +
                    salary.medicalAllowance +
                    salary.specialAllowance +
                    salary.otherAllowances;

                  return (
                    <tr key={salary.salaryId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {salary.employeeName}
                        </div>
                        <div className="text-sm text-gray-500">{salary.employeeCode}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {formatCurrency(salary.basicSalary)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                        {formatCurrency(totalAllowances)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600 text-right">
                        {formatCurrency(salary.grossSalary)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 text-right">
                        {formatCurrency(salary.totalDeductions)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600 text-right">
                        {formatCurrency(salary.netSalary)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(salary.effectiveFrom).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button
                          onClick={() => onEdit(salary.salaryId)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(salary.salaryId, salary.employeeName)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Deactivate
                        </button>
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

export default SalaryList;
