import { useState, useEffect } from 'react';
import { salaryService } from '../../services/salaryService';
import { employeeService } from '../../services/employeeService';
import { siteService } from '../../services/siteService';
import * as XLSX from 'xlsx';

const SalaryList = ({ onEdit, onAddNew, onViewPayslips }) => {
  const [salaries, setSalaries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filteredSalaries, setFilteredSalaries] = useState([]);
  const [sites, setSites] = useState([]);
  const [selectedSite, setSelectedSite] = useState('ALL');
  const [employees, setEmployees] = useState([]);

  useEffect(() => {
    loadSalaries();
    loadSummary();
    loadSites();
    loadEmployees();
  }, []);

  useEffect(() => {
    filterSalaries();
  }, [salaries, searchKeyword, selectedSite]);

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

  const loadSites = async () => {
    try {
      const response = await siteService.getAllSites();
      if (response.success) {
        setSites(response.data);
      }
    } catch (error) {
      console.error('Failed to load sites:', error);
    }
  };

  const loadEmployees = async () => {
    try {
      const response = await employeeService.getAllEmployees();
      if (response.success) {
        setEmployees(response.data);
      }
    } catch (error) {
      console.error('Failed to load employees:', error);
    }
  };

  const filterSalaries = () => {
    let filtered = salaries;

    // Filter by site
    if (selectedSite !== 'ALL') {
      const siteEmployees = employees.filter(emp => emp.siteId === selectedSite);
      const siteEmployeeIds = siteEmployees.map(emp => emp.employeeId);
      filtered = filtered.filter(sal => siteEmployeeIds.includes(sal.employeeId));
    }

    // Filter by search keyword
    if (searchKeyword.trim()) {
      const keyword = searchKeyword.toLowerCase();
      filtered = filtered.filter(
        (sal) =>
          sal.employeeName?.toLowerCase().includes(keyword) ||
          sal.employeeCode?.toLowerCase().includes(keyword)
      );
    }

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

  const exportToExcel = () => {
    if (filteredSalaries.length === 0) {
      alert('No data to export');
      return;
    }

    // Group salaries by site
    const salariesBySite = {};

    filteredSalaries.forEach(salary => {
      const employee = employees.find(emp => emp.employeeId === salary.employeeId);
      const siteId = employee?.siteId || 'UNASSIGNED';

      if (!salariesBySite[siteId]) {
        salariesBySite[siteId] = [];
      }

      salariesBySite[siteId].push({
        employee,
        salary
      });
    });

    // Create workbook
    const wb = XLSX.utils.book_new();

    // Helper function to calculate working days for current month
    const getWorkingDays = () => {
      const today = new Date();
      const year = today.getFullYear();
      const month = today.getMonth();
      return new Date(year, month + 1, 0).getDate(); // Last day of month
    };

    const workingDays = getWorkingDays();
    const monthName = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    // Create a sheet for each site
    Object.keys(salariesBySite).forEach(siteId => {
      const siteData = salariesBySite[siteId];
      const site = sites.find(s => s.siteId === siteId);
      const siteName = site ? site.siteName : 'Unassigned';
      const siteCode = site ? site.siteCode : 'N/A';

      // Create array of arrays (not JSON) to match the exact format
      const wsData = [];

      // Row 1: Company Header (spanning multiple columns)
      wsData.push(['', '', '', '', '', '', siteName.toUpperCase(), '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '']);

      // Row 2: Statement and Working Days
      wsData.push([
        '',
        `Statement of Attendance  :    ${monthName}                                                Working Days : ${workingDays}`,
        '', '', '', '',
        `WORKING DAYS - ${workingDays}`,
        '', '', '',
        'Fixed Salary', '', '', '',
        'Earnings Salary', '', '', '',
        'Deductions', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
      ]);

      // Row 3: Column Headers
      wsData.push([
        'Sr No',
        'EMP CODE',
        'EMP NAME',
        'Designation',
        'Location',
        'Month Days',
        'No of days Present',
        'Monthly Pay Scale',
        'Gross',
        'Net Pay',
        'BASIC', 'HRA', 'Incentive/Other Allawance', 'GROSS PAYABLE',
        'BASIC', 'HRA', 'Incentive/Other Allawance', 'GROSS PAYABLE',
        'PF SHARE', 'MEDICLAIM', 'PT', 'Advance', 'ESIC', 'PPE Deposit', 'DEDUCTIONS', 'NET PAYABLE',
        'REMARK', 'IFSC CODE', 'Account Number', '', '', '', ''
      ]);

      // Data rows
      siteData.forEach(({ employee, salary }, index) => {
        const otherAllowances =
          salary.da +
          salary.conveyanceAllowance +
          salary.medicalAllowance +
          salary.specialAllowance +
          salary.otherAllowances;

        const row = [
          index + 1,                              // Sr No
          salary.employeeCode,                    // EMP CODE
          salary.employeeName,                    // EMP NAME
          employee?.designation || '-',           // Designation
          siteName,                               // Location
          workingDays,                            // Month Days
          workingDays,                            // No of days Present (assuming full attendance)
          '',                                     // Monthly Pay Scale (empty)
          salary.grossSalary,                     // Gross
          salary.netSalary,                       // Net Pay
          // Fixed Salary
          salary.basicSalary,                     // BASIC
          salary.hra,                             // HRA
          otherAllowances,                        // Incentive/Other Allawance
          salary.grossSalary,                     // GROSS PAYABLE
          // Earnings Salary (same as fixed for full attendance)
          salary.basicSalary,                     // BASIC
          salary.hra,                             // HRA
          otherAllowances,                        // Incentive/Other Allawance
          salary.grossSalary,                     // GROSS PAYABLE
          // Deductions
          salary.pfDeduction,                     // PF SHARE
          0,                                      // MEDICLAIM
          salary.professionalTax,                 // PT
          0,                                      // Advance
          salary.esiDeduction,                    // ESIC
          0,                                      // PPE Deposit
          salary.totalDeductions,                 // DEDUCTIONS
          salary.netSalary,                       // NET PAYABLE
          employee?.status || 'ACTIVE',           // REMARK
          employee?.ifscCode || '',               // IFSC CODE
          employee?.accountNumber || '',          // Account Number
          '', '', '', ''                          // Empty columns
        ];
        wsData.push(row);
      });

      // Summary row
      const totalGross = siteData.reduce((sum, item) => sum + item.salary.grossSalary, 0);
      const totalNet = siteData.reduce((sum, item) => sum + item.salary.netSalary, 0);
      const totalBasic = siteData.reduce((sum, item) => sum + item.salary.basicSalary, 0);
      const totalHRA = siteData.reduce((sum, item) => sum + item.salary.hra, 0);
      const totalPF = siteData.reduce((sum, item) => sum + item.salary.pfDeduction, 0);
      const totalESI = siteData.reduce((sum, item) => sum + item.salary.esiDeduction, 0);
      const totalPT = siteData.reduce((sum, item) => sum + item.salary.professionalTax, 0);
      const totalDeductions = siteData.reduce((sum, item) => sum + item.salary.totalDeductions, 0);

      wsData.push([
        '',
        'TOTAL',
        '',
        '',
        '',
        '',
        '',
        '',
        totalGross,
        totalNet,
        totalBasic,
        totalHRA,
        '',
        '',
        totalBasic,
        totalHRA,
        '',
        '',
        totalPF,
        '',
        totalPT,
        '',
        totalESI,
        '',
        totalDeductions,
        totalNet,
        '',
        '',
        '',
        '', '', '', ''
      ]);

      // Create worksheet from array of arrays
      const ws = XLSX.utils.aoa_to_sheet(wsData);

      // Merge cells for headers
      if (!ws['!merges']) ws['!merges'] = [];

      // Merge company name header (Row 1, cols G to L)
      ws['!merges'].push({ s: { r: 0, c: 6 }, e: { r: 0, c: 11 } });

      // Set column widths to match original format
      ws['!cols'] = [
        { wch: 6 },   // Sr No
        { wch: 10 },  // EMP CODE
        { wch: 20 },  // EMP NAME
        { wch: 18 },  // Designation
        { wch: 15 },  // Location
        { wch: 10 },  // Month Days
        { wch: 15 },  // No of days Present
        { wch: 15 },  // Monthly Pay Scale
        { wch: 12 },  // Gross
        { wch: 12 },  // Net Pay
        { wch: 12 },  // BASIC (Fixed)
        { wch: 10 },  // HRA (Fixed)
        { wch: 18 },  // Incentive (Fixed)
        { wch: 12 },  // GROSS PAYABLE (Fixed)
        { wch: 12 },  // BASIC (Earnings)
        { wch: 10 },  // HRA (Earnings)
        { wch: 18 },  // Incentive (Earnings)
        { wch: 12 },  // GROSS PAYABLE (Earnings)
        { wch: 10 },  // PF SHARE
        { wch: 10 },  // MEDICLAIM
        { wch: 8 },   // PT
        { wch: 10 },  // Advance
        { wch: 8 },   // ESIC
        { wch: 10 },  // PPE Deposit
        { wch: 12 },  // DEDUCTIONS
        { wch: 12 },  // NET PAYABLE
        { wch: 15 },  // REMARK
        { wch: 12 },  // IFSC CODE
        { wch: 15 },  // Account Number
        { wch: 5 },   // Empty
        { wch: 5 },   // Empty
        { wch: 5 },   // Empty
        { wch: 5 }    // Empty
      ];

      // Add sheet to workbook (Excel sheet names can't be longer than 31 chars)
      const sheetName = siteName.substring(0, 31);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });

    // Generate filename
    const filterText = selectedSite !== 'ALL'
      ? `_${sites.find(s => s.siteId === selectedSite)?.siteCode || 'Site'}`
      : '_AllSites';
    const filename = `Salary_Report${filterText}_${new Date().toISOString().split('T')[0]}.xlsx`;

    // Save file
    XLSX.writeFile(wb, filename);
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
        <div className="flex flex-wrap gap-4">
          <select
            value={selectedSite}
            onChange={(e) => setSelectedSite(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
          >
            <option value="ALL">All Sites</option>
            {sites.map((site) => (
              <option key={site.siteId} value={site.siteId}>
                {site.siteCode} - {site.siteName}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Search by employee name or code..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            className="flex-1 min-w-[200px] rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
          />
          <button
            onClick={exportToExcel}
            className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            Export to Excel
          </button>
          <button
            onClick={onViewPayslips}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            View Payslips
          </button>
        </div>
        <div className="mt-2 text-sm text-gray-600">
          Showing {filteredSalaries.length} of {salaries.length} salary structures
          {selectedSite !== 'ALL' && ` (Filtered by: ${sites.find(s => s.siteId === selectedSite)?.siteName})`}
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
