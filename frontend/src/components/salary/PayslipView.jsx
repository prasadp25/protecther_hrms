import { useState, useEffect } from 'react';
import { salaryService } from '../../services/salaryService';
import { employeeService } from '../../services/employeeService';
import { siteService } from '../../services/siteService';
import * as XLSX from 'xlsx';

const PayslipView = ({ onBack }) => {
  const [view, setView] = useState('list'); // 'list' or 'generate' or 'detail'
  const [payslips, setPayslips] = useState([]);
  const [selectedPayslip, setSelectedPayslip] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );
  const [filteredPayslips, setFilteredPayslips] = useState([]);
  const [sites, setSites] = useState([]);
  const [selectedSite, setSelectedSite] = useState('ALL');

  // Generate form state
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [salaryStructure, setSalaryStructure] = useState(null);
  const [generateFormData, setGenerateFormData] = useState({
    month: new Date().toISOString().slice(0, 7),
    totalWorkingDays: 26,
    daysPresent: 26,
    overtime: 0,
    remarks: '',
  });

  useEffect(() => {
    loadPayslips();
    loadEmployees();
    loadSites();
  }, []);

  useEffect(() => {
    filterPayslipsByMonth();
  }, [payslips, selectedMonth, selectedSite]);

  const loadPayslips = async () => {
    try {
      setLoading(true);
      const response = await salaryService.getAllPayslips();
      if (response.success) {
        setPayslips(response.data);
      }
    } catch (error) {
      alert('Failed to load payslips');
    } finally {
      setLoading(false);
    }
  };

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

  const filterPayslipsByMonth = () => {
    let filtered = payslips;

    // Filter by month
    if (selectedMonth) {
      filtered = filtered.filter((slip) => slip.month === selectedMonth);
    }

    // Filter by site
    if (selectedSite !== 'ALL') {
      const siteEmployees = employees.filter(emp => emp.siteId === selectedSite);
      const siteEmployeeIds = siteEmployees.map(emp => emp.employeeId);
      filtered = filtered.filter(slip => siteEmployeeIds.includes(slip.employeeId));
    }

    setFilteredPayslips(filtered);
  };

  const handleEmployeeSelect = async (e) => {
    const employeeId = parseInt(e.target.value);
    const employee = employees.find((emp) => emp.employeeId === employeeId);

    if (employee) {
      setSelectedEmployee(employee);
      // Load salary structure for this employee
      try {
        const response = await salaryService.getSalaryByEmployeeId(employeeId);
        if (response.success) {
          setSalaryStructure(response.data);
        } else {
          alert('No salary structure found for this employee');
          setSalaryStructure(null);
        }
      } catch (error) {
        alert('Failed to load salary structure');
        setSalaryStructure(null);
      }
    }
  };

  const handleGenerateFormChange = (e) => {
    const { name, value } = e.target;
    setGenerateFormData((prev) => ({
      ...prev,
      [name]: name === 'remarks' ? value : parseFloat(value) || 0,
    }));
  };

  const calculatePayslipData = () => {
    if (!salaryStructure) return null;

    const calculated = salaryService.calculateEmployeeSalary(
      salaryStructure,
      generateFormData.totalWorkingDays,
      generateFormData.daysPresent,
      generateFormData.overtime
    );

    return calculated;
  };

  const handleGeneratePayslip = async () => {
    if (!selectedEmployee || !salaryStructure) {
      alert('Please select an employee');
      return;
    }

    const calculated = calculatePayslipData();

    const payslipData = {
      employeeId: selectedEmployee.employeeId,
      employeeCode: selectedEmployee.employeeCode,
      employeeName: `${selectedEmployee.firstName} ${selectedEmployee.lastName}`,
      month: generateFormData.month,
      salaryId: salaryStructure.salaryId,
      totalWorkingDays: generateFormData.totalWorkingDays,
      daysPresent: generateFormData.daysPresent,
      daysAbsent: generateFormData.totalWorkingDays - generateFormData.daysPresent,
      paidLeaves: 0,
      unpaidLeaves: generateFormData.totalWorkingDays - generateFormData.daysPresent,
      overtime: generateFormData.overtime,
      ...calculated,
      paymentStatus: 'PENDING',
      remarks: generateFormData.remarks,
    };

    try {
      setLoading(true);
      const response = await salaryService.generatePayslip(payslipData);
      if (response.success) {
        alert(response.message);
        loadPayslips();
        setView('list');
        resetGenerateForm();
      }
    } catch (error) {
      alert('Failed to generate payslip');
    } finally {
      setLoading(false);
    }
  };

  const resetGenerateForm = () => {
    setSelectedEmployee(null);
    setSalaryStructure(null);
    setGenerateFormData({
      month: new Date().toISOString().slice(0, 7),
      totalWorkingDays: 26,
      daysPresent: 26,
      overtime: 0,
      remarks: '',
    });
  };

  const handleViewPayslip = (payslip) => {
    setSelectedPayslip(payslip);
    setView('detail');
  };

  const handleMarkAsPaid = async (payslipId) => {
    if (!window.confirm('Mark this payslip as paid?')) return;

    try {
      const response = await salaryService.updatePaymentStatus(payslipId, {
        paymentStatus: 'PAID',
        paymentMethod: 'BANK_TRANSFER',
      });
      if (response.success) {
        alert(response.message);
        loadPayslips();
        if (selectedPayslip?.payslipId === payslipId) {
          setSelectedPayslip(response.data);
        }
      }
    } catch (error) {
      alert('Failed to update payment status');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status) => {
    const baseClasses = 'px-3 py-1 rounded-full text-xs font-semibold';
    if (status === 'PAID') {
      return `${baseClasses} bg-green-100 text-green-800`;
    }
    return `${baseClasses} bg-yellow-100 text-yellow-800`;
  };

  const exportPayslipsToExcel = () => {
    if (filteredPayslips.length === 0) {
      alert('No payslips to export');
      return;
    }

    // Group payslips by site
    const payslipsBySite = {};

    filteredPayslips.forEach(payslip => {
      const employee = employees.find(emp => emp.employeeId === payslip.employeeId);
      const siteId = employee?.siteId || 'UNASSIGNED';

      if (!payslipsBySite[siteId]) {
        payslipsBySite[siteId] = [];
      }

      payslipsBySite[siteId].push({
        employee,
        payslip
      });
    });

    // Create workbook
    const wb = XLSX.utils.book_new();

    // Get month name from selected month or use current
    const monthDate = selectedMonth ? new Date(selectedMonth + '-01') : new Date();
    const monthName = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    // Create a sheet for each site
    Object.keys(payslipsBySite).forEach(siteId => {
      const siteData = payslipsBySite[siteId];
      const site = sites.find(s => s.siteId === siteId);
      const siteName = site ? site.siteName : 'Unassigned';
      const siteCode = site ? site.siteCode : 'N/A';

      // Get working days from first payslip (should be same for all in the month)
      const workingDays = siteData[0]?.payslip.totalWorkingDays || 30;

      // Create array of arrays to match the format
      const wsData = [];

      // Row 1: Company Header
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

      // Data rows - using actual payslip data with attendance
      siteData.forEach(({ employee, payslip }, index) => {
        // Calculate proportional salary based on attendance
        const attendanceRatio = payslip.daysPresent / payslip.totalWorkingDays;
        const earnedBasic = Math.round(payslip.basicSalary * attendanceRatio);
        const earnedHRA = Math.round(payslip.hra * attendanceRatio);
        const earnedOtherAllowances = Math.round(payslip.otherAllowances * attendanceRatio) + (payslip.overtimeAmount || 0);

        const row = [
          index + 1,                              // Sr No
          payslip.employeeCode,                   // EMP CODE
          payslip.employeeName,                   // EMP NAME
          employee?.designation || '-',           // Designation
          siteName,                               // Location
          payslip.totalWorkingDays,               // Month Days
          payslip.daysPresent,                    // No of days Present
          '',                                     // Monthly Pay Scale (empty)
          payslip.grossSalary,                    // Gross (earned)
          payslip.netSalary,                      // Net Pay
          // Fixed Salary (monthly rate)
          payslip.basicSalary,                    // BASIC
          payslip.hra,                            // HRA
          payslip.otherAllowances,                // Incentive/Other Allawance
          payslip.basicSalary + payslip.hra + payslip.otherAllowances, // GROSS PAYABLE
          // Earnings Salary (actual earned based on attendance)
          earnedBasic,                            // BASIC
          earnedHRA,                              // HRA
          earnedOtherAllowances,                  // Incentive/Other Allawance
          payslip.grossSalary,                    // GROSS PAYABLE
          // Deductions
          payslip.pfDeduction,                    // PF SHARE
          payslip.healthInsurance || 0,           // MEDICLAIM
          payslip.professionalTax,                // PT
          payslip.advanceDeduction || 0,          // Advance
          payslip.esiDeduction || 0,              // ESIC
          0,                                      // PPE Deposit
          payslip.totalDeductions,                // DEDUCTIONS
          payslip.netSalary,                      // NET PAYABLE
          payslip.paymentStatus,                  // REMARK
          employee?.ifscCode || '',               // IFSC CODE
          employee?.accountNumber || '',          // Account Number
          '', '', '', ''                          // Empty columns
        ];
        wsData.push(row);
      });

      // Summary row
      const totalGross = siteData.reduce((sum, item) => sum + item.payslip.grossSalary, 0);
      const totalNet = siteData.reduce((sum, item) => sum + item.payslip.netSalary, 0);
      const totalBasic = siteData.reduce((sum, item) => {
        const ratio = item.payslip.daysPresent / item.payslip.totalWorkingDays;
        return sum + Math.round(item.payslip.basicSalary * ratio);
      }, 0);
      const totalHRA = siteData.reduce((sum, item) => {
        const ratio = item.payslip.daysPresent / item.payslip.totalWorkingDays;
        return sum + Math.round(item.payslip.hra * ratio);
      }, 0);
      const totalPF = siteData.reduce((sum, item) => sum + item.payslip.pfDeduction, 0);
      const totalESI = siteData.reduce((sum, item) => sum + (item.payslip.esiDeduction || 0), 0);
      const totalPT = siteData.reduce((sum, item) => sum + item.payslip.professionalTax, 0);
      const totalAdvance = siteData.reduce((sum, item) => sum + (item.payslip.advanceDeduction || 0), 0);
      const totalDeductions = siteData.reduce((sum, item) => sum + item.payslip.totalDeductions, 0);

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
        '',
        '',
        '',
        '',
        totalBasic,
        totalHRA,
        '',
        '',
        totalPF,
        '',
        totalPT,
        totalAdvance,
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

      // Add sheet to workbook
      const sheetName = siteName.substring(0, 31);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });

    // Generate filename
    const monthText = selectedMonth ? `_${selectedMonth}` : '';
    const filterText = selectedSite !== 'ALL'
      ? `_${sites.find(s => s.siteId === selectedSite)?.siteCode || 'Site'}`
      : '_AllSites';
    const filename = `Payslips${monthText}${filterText}_${new Date().toISOString().split('T')[0]}.xlsx`;

    // Save file
    XLSX.writeFile(wb, filename);
  };

  // Render payslip list view
  if (view === 'list') {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              ← Back to Salaries
            </button>
            <h2 className="text-2xl font-bold text-gray-900">Payslip Management</h2>
          </div>
          <button
            onClick={() => setView('generate')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            + Generate Payslip
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Month:</label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Site:</label>
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
            </div>
            <button
              onClick={exportPayslipsToExcel}
              className="ml-auto px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              Export to Excel
            </button>
          </div>
          <div className="mt-2 text-sm text-gray-600">
            Showing {filteredPayslips.length} payslips
            {selectedSite !== 'ALL' && ` (Filtered by: ${sites.find(s => s.siteId === selectedSite)?.siteName})`}
          </div>
        </div>

        {/* Payslip Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">Loading payslips...</p>
            </div>
          ) : filteredPayslips.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600">No payslips found for this month</p>
              <button
                onClick={() => setView('generate')}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Generate First Payslip
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Employee
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Month
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Days Present
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Gross Salary
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Net Salary
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredPayslips.map((payslip) => (
                    <tr key={payslip.payslipId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {payslip.employeeName}
                        </div>
                        <div className="text-sm text-gray-500">{payslip.employeeCode}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(payslip.month + '-01').toLocaleDateString('en-US', {
                          month: 'long',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {payslip.daysPresent} / {payslip.totalWorkingDays}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {formatCurrency(payslip.grossSalary)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600 text-right">
                        {formatCurrency(payslip.netSalary)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={getStatusBadge(payslip.paymentStatus)}>
                          {payslip.paymentStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button
                          onClick={() => handleViewPayslip(payslip)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          View
                        </button>
                        {payslip.paymentStatus === 'PENDING' && (
                          <button
                            onClick={() => handleMarkAsPaid(payslip.payslipId)}
                            className="text-green-600 hover:text-green-900"
                          >
                            Mark Paid
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Render generate payslip form
  if (view === 'generate') {
    const calculated = calculatePayslipData();

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">Generate Payslip</h2>
          <button
            onClick={() => {
              setView('list');
              resetGenerateForm();
            }}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>

        <div className="bg-white p-6 rounded-lg shadow space-y-6">
          {/* Employee Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Select Employee *</label>
              <select
                value={selectedEmployee?.employeeId || ''}
                onChange={handleEmployeeSelect}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
              >
                <option value="">-- Select Employee --</option>
                {employees.map((emp) => (
                  <option key={emp.employeeId} value={emp.employeeId}>
                    {emp.employeeCode} - {emp.firstName} {emp.lastName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Month *</label>
              <input
                type="month"
                name="month"
                value={generateFormData.month}
                onChange={handleGenerateFormChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
              />
            </div>
          </div>

          {/* Attendance Details */}
          {salaryStructure && (
            <>
              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Attendance Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Total Working Days
                    </label>
                    <input
                      type="number"
                      name="totalWorkingDays"
                      value={generateFormData.totalWorkingDays}
                      onChange={handleGenerateFormChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
                      min="1"
                      max="31"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Days Present</label>
                    <input
                      type="number"
                      name="daysPresent"
                      value={generateFormData.daysPresent}
                      onChange={handleGenerateFormChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
                      min="0"
                      max={generateFormData.totalWorkingDays}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Overtime Hours
                    </label>
                    <input
                      type="number"
                      name="overtime"
                      value={generateFormData.overtime}
                      onChange={handleGenerateFormChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
                      min="0"
                      step="0.5"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700">Remarks</label>
                  <textarea
                    name="remarks"
                    value={generateFormData.remarks}
                    onChange={handleGenerateFormChange}
                    rows="2"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
                  />
                </div>
              </div>

              {/* Calculated Summary */}
              {calculated && (
                <div className="border-t pt-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Payslip Summary</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="space-y-2">
                      <h4 className="font-semibold text-gray-700">Earnings:</h4>
                      <div className="flex justify-between">
                        <span>Basic Salary:</span>
                        <span>{formatCurrency(calculated.basicSalary)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>HRA:</span>
                        <span>{formatCurrency(calculated.hra)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Other Allowances:</span>
                        <span>{formatCurrency(calculated.otherAllowances)}</span>
                      </div>
                      {calculated.overtimeAmount > 0 && (
                        <div className="flex justify-between">
                          <span>Overtime:</span>
                          <span>{formatCurrency(calculated.overtimeAmount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold text-blue-600 border-t pt-2">
                        <span>Gross Salary:</span>
                        <span>{formatCurrency(calculated.grossSalary)}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-semibold text-gray-700">Deductions:</h4>
                      <div className="flex justify-between">
                        <span>PF:</span>
                        <span>{formatCurrency(calculated.pfDeduction)}</span>
                      </div>
                      {calculated.esiDeduction > 0 && (
                        <div className="flex justify-between">
                          <span>ESI:</span>
                          <span>{formatCurrency(calculated.esiDeduction)}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span>Professional Tax:</span>
                        <span>{formatCurrency(calculated.professionalTax)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>TDS:</span>
                        <span>{formatCurrency(calculated.tds)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-red-600 border-t pt-2">
                        <span>Total Deductions:</span>
                        <span>{formatCurrency(calculated.totalDeductions)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 bg-green-50 p-4 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold text-gray-700">Net Salary:</span>
                      <span className="text-3xl font-bold text-green-600">
                        {formatCurrency(calculated.netSalary)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  onClick={handleGeneratePayslip}
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300"
                >
                  {loading ? 'Generating...' : 'Generate Payslip'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // Render payslip detail view
  if (view === 'detail' && selectedPayslip) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <button
            onClick={() => {
              setView('list');
              setSelectedPayslip(null);
            }}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            ← Back to List
          </button>
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Print Payslip
          </button>
        </div>

        {/* Payslip Detail */}
        <div className="bg-white p-8 rounded-lg shadow">
          <div className="border-b pb-4 mb-6">
            <h2 className="text-3xl font-bold text-center text-gray-900">PAYSLIP</h2>
            <p className="text-center text-gray-600 mt-2">
              {new Date(selectedPayslip.month + '-01').toLocaleDateString('en-US', {
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </div>

          {/* Employee Info */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="font-semibold text-gray-700 mb-2">Employee Details</h3>
              <div className="space-y-1 text-sm">
                <div>
                  <span className="text-gray-600">Name:</span>{' '}
                  <span className="font-medium">{selectedPayslip.employeeName}</span>
                </div>
                <div>
                  <span className="text-gray-600">Employee Code:</span>{' '}
                  <span className="font-medium">{selectedPayslip.employeeCode}</span>
                </div>
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-gray-700 mb-2">Payment Details</h3>
              <div className="space-y-1 text-sm">
                <div>
                  <span className="text-gray-600">Payment Status:</span>{' '}
                  <span className={getStatusBadge(selectedPayslip.paymentStatus)}>
                    {selectedPayslip.paymentStatus}
                  </span>
                </div>
                {selectedPayslip.paymentDate && (
                  <div>
                    <span className="text-gray-600">Payment Date:</span>{' '}
                    <span className="font-medium">
                      {new Date(selectedPayslip.paymentDate).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Attendance */}
          <div className="mb-6 bg-gray-50 p-4 rounded">
            <h3 className="font-semibold text-gray-700 mb-2">Attendance</h3>
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Working Days:</span>
                <div className="font-medium">{selectedPayslip.totalWorkingDays}</div>
              </div>
              <div>
                <span className="text-gray-600">Present:</span>
                <div className="font-medium text-green-600">{selectedPayslip.daysPresent}</div>
              </div>
              <div>
                <span className="text-gray-600">Absent:</span>
                <div className="font-medium text-red-600">{selectedPayslip.daysAbsent}</div>
              </div>
              <div>
                <span className="text-gray-600">Overtime:</span>
                <div className="font-medium">{selectedPayslip.overtime} hrs</div>
              </div>
            </div>
          </div>

          {/* Earnings and Deductions */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="border rounded p-4">
              <h3 className="font-semibold text-gray-700 mb-3">Earnings</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Basic Salary</span>
                  <span>{formatCurrency(selectedPayslip.basicSalary)}</span>
                </div>
                <div className="flex justify-between">
                  <span>HRA</span>
                  <span>{formatCurrency(selectedPayslip.hra)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Other Allowances</span>
                  <span>{formatCurrency(selectedPayslip.otherAllowances)}</span>
                </div>
                {selectedPayslip.overtimeAmount > 0 && (
                  <div className="flex justify-between">
                    <span>Overtime</span>
                    <span>{formatCurrency(selectedPayslip.overtimeAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-blue-600 border-t pt-2">
                  <span>Gross Salary</span>
                  <span>{formatCurrency(selectedPayslip.grossSalary)}</span>
                </div>
              </div>
            </div>

            <div className="border rounded p-4">
              <h3 className="font-semibold text-gray-700 mb-3">Deductions</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>PF</span>
                  <span>{formatCurrency(selectedPayslip.pfDeduction)}</span>
                </div>
                {selectedPayslip.esiDeduction > 0 && (
                  <div className="flex justify-between">
                    <span>ESI</span>
                    <span>{formatCurrency(selectedPayslip.esiDeduction)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Professional Tax</span>
                  <span>{formatCurrency(selectedPayslip.professionalTax)}</span>
                </div>
                <div className="flex justify-between">
                  <span>TDS</span>
                  <span>{formatCurrency(selectedPayslip.tds)}</span>
                </div>
                {selectedPayslip.advanceDeduction > 0 && (
                  <div className="flex justify-between">
                    <span>Advance</span>
                    <span>{formatCurrency(selectedPayslip.advanceDeduction)}</span>
                  </div>
                )}
                {selectedPayslip.welfareDeduction > 0 && (
                  <div className="flex justify-between">
                    <span>Welfare</span>
                    <span>{formatCurrency(selectedPayslip.welfareDeduction)}</span>
                  </div>
                )}
                {selectedPayslip.healthInsurance > 0 && (
                  <div className="flex justify-between">
                    <span>Health Insurance</span>
                    <span>{formatCurrency(selectedPayslip.healthInsurance)}</span>
                  </div>
                )}
                {selectedPayslip.otherDeductions > 0 && (
                  <div className="flex justify-between">
                    <span>Other</span>
                    <span>{formatCurrency(selectedPayslip.otherDeductions)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-red-600 border-t pt-2">
                  <span>Total Deductions</span>
                  <span>{formatCurrency(selectedPayslip.totalDeductions)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Net Salary */}
          <div className="bg-green-50 p-6 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-xl font-semibold text-gray-700">Net Salary Payable:</span>
              <span className="text-4xl font-bold text-green-600">
                {formatCurrency(selectedPayslip.netSalary)}
              </span>
            </div>
          </div>

          {selectedPayslip.remarks && (
            <div className="mt-4 text-sm text-gray-600">
              <span className="font-semibold">Remarks:</span> {selectedPayslip.remarks}
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
};

export default PayslipView;
