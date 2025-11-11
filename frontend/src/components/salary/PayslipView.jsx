import { useState, useEffect } from 'react';
import { salaryService } from '../../services/salaryService';
import { employeeService } from '../../services/employeeService';
import { siteService } from '../../services/siteService';
import { attendanceService } from '../../services/attendanceService';
import * as XLSX from 'xlsx';
import { pdf } from '@react-pdf/renderer';
import PayslipPDFTemplateNew from './PayslipPDFTemplateNew';
import SiteWiseSalaryPDFTemplate from './SiteWiseSalaryPDFTemplate';

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
  const [attendanceData, setAttendanceData] = useState(null);
  const [generateFormData, setGenerateFormData] = useState({
    month: new Date().toISOString().slice(0, 7),
    advance_deduction: 0,
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
        // Transform snake_case to camelCase and add computed fields
        const transformedPayslips = response.data.map(p => ({
          ...p,
          payslipId: p.payslip_id,
          employeeId: p.employee_id,
          employeeName: `${p.first_name} ${p.last_name}`,
          employeeCode: p.employee_code,
          grossSalary: p.gross_salary,
          netSalary: p.net_salary,
          basicSalary: p.basic_salary,
          hra: p.hra,
          otherAllowances: p.other_allowances,
          overtimeAmount: p.overtime_amount || 0,
          pfDeduction: p.pf_deduction,
          esiDeduction: p.esi_deduction || 0,
          professionalTax: p.professional_tax,
          tds: p.tds,
          advanceDeduction: p.advance_deduction || 0,
          welfareDeduction: p.welfare_deduction || 0,
          healthInsurance: p.health_insurance || 0,
          otherDeductions: p.other_deductions || 0,
          totalDeductions: p.total_deductions,
          daysPresent: p.days_present,
          daysAbsent: p.days_absent,
          totalWorkingDays: p.total_working_days,
          overtime: p.overtime || 0,
          paymentStatus: p.payment_status,
          paymentDate: p.payment_date,
          paymentMethod: p.payment_method
        }));
        setPayslips(transformedPayslips);
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
        // Transform snake_case to camelCase
        const transformedSites = response.data.map(s => ({
          ...s,
          siteId: s.site_id,
          siteName: s.site_name,
          siteCode: s.site_code
        }));
        setSites(transformedSites);
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
      const siteEmployees = employees.filter(emp => emp.site_id === selectedSite);
      const siteEmployeeIds = siteEmployees.map(emp => emp.employee_id);
      filtered = filtered.filter(slip => siteEmployeeIds.includes(slip.employee_id));
    }

    setFilteredPayslips(filtered);
  };

  const handleEmployeeSelect = async (e) => {
    const employeeId = parseInt(e.target.value);
    const employee = employees.find((emp) => emp.employee_id === employeeId);

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
          setAttendanceData(null);
          return;
        }
      } catch (error) {
        alert('Failed to load salary structure');
        setSalaryStructure(null);
        setAttendanceData(null);
        return;
      }

      // Load attendance data for the selected month
      await loadAttendanceForEmployee(employeeId, generateFormData.month);
    }
  };

  const loadAttendanceForEmployee = async (employeeId, month) => {
    try {
      const response = await attendanceService.getAttendanceByMonth(month);
      if (response.success) {
        const empAttendance = response.data.find(att => att.employee_id === employeeId);
        if (empAttendance) {
          setAttendanceData(empAttendance);
        } else {
          setAttendanceData(null);
          alert(`No attendance record found for ${month}. Please mark attendance first in the Attendance module.`);
        }
      }
    } catch (error) {
      console.error('Failed to load attendance:', error);
      setAttendanceData(null);
      alert('Failed to load attendance data');
    }
  };

  const handleGenerateFormChange = async (e) => {
    const { name, value } = e.target;
    setGenerateFormData((prev) => ({
      ...prev,
      [name]: name === 'remarks' ? value : parseFloat(value) || 0,
    }));

    // Reload attendance when month changes
    if (name === 'month' && selectedEmployee) {
      await loadAttendanceForEmployee(selectedEmployee.employee_id, value);
    }
  };

  // Removed calculatePayslipData - backend now handles all calculations using attendance data

  const handleGeneratePayslip = async () => {
    if (!selectedEmployee || !salaryStructure) {
      alert('Please select an employee');
      return;
    }

    if (!attendanceData) {
      alert('No attendance record found for this employee in the selected month. Please mark attendance first.');
      return;
    }

    // Extract month and year from the month string (YYYY-MM)
    const [year, month] = generateFormData.month.split('-');

    const payslipData = {
      employee_id: selectedEmployee.employee_id,
      month: parseInt(month),
      year: parseInt(year),
      advance_deduction: generateFormData.advance_deduction || 0,
      remarks: generateFormData.remarks || ''
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
      const errorMsg = error.response?.data?.message || 'Failed to generate payslip';
      alert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const resetGenerateForm = () => {
    setSelectedEmployee(null);
    setSalaryStructure(null);
    setAttendanceData(null);
    setGenerateFormData({
      month: new Date().toISOString().slice(0, 7),
      advance_deduction: 0,
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
      const employee = employees.find(emp => emp.employee_id === payslip.employeeId);
      const siteId = employee?.site_id || 'UNASSIGNED';

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
      const site = sites.find(s => String(s.siteId) === String(siteId));
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
        const attendanceRatio = payslip.daysPresent / (payslip.totalDaysInMonth || payslip.totalWorkingDays);
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
          employee?.ifsc_code || '',              // IFSC CODE
          employee?.account_number || '',         // Account Number
          '', '', '', ''                          // Empty columns
        ];
        wsData.push(row);
      });

      // Summary row
      const totalGross = siteData.reduce((sum, item) => sum + item.payslip.grossSalary, 0);
      const totalNet = siteData.reduce((sum, item) => sum + item.payslip.netSalary, 0);
      const totalBasic = siteData.reduce((sum, item) => {
        const ratio = item.payslip.daysPresent / (item.payslip.totalDaysInMonth || item.payslip.totalWorkingDays);
        return sum + Math.round(item.payslip.basicSalary * ratio);
      }, 0);
      const totalHRA = siteData.reduce((sum, item) => {
        const ratio = item.payslip.daysPresent / (item.payslip.totalDaysInMonth || item.payslip.totalWorkingDays);
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

  // NEW: Much cleaner PDF generation using @react-pdf/renderer
  const downloadPayslipPDF = async (payslip) => {
    try {
      // Find employee data
      const employee = employees.find(e => e.employee_id === payslip.employeeId);

      // Debug: Log employee data to check what fields are available
      console.log('Employee data for PDF:', employee);

      // Generate PDF blob using our React component
      const blob = await pdf(
        <PayslipPDFTemplateNew payslip={payslip} employee={employee} />
      ).toBlob();

      // Download the PDF
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Payslip_${payslip.employeeCode}_${payslip.month}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  // Site-wise Salary Sheet PDF Download
  const downloadSiteWisePDF = async () => {
    try {
      // Get site information
      const site = selectedSite === 'ALL'
        ? { siteId: 'ALL', siteName: 'All Sites', siteCode: 'ALL' }
        : sites.find(s => s.siteId === selectedSite);

      if (!site) {
        alert('Please select a valid site');
        return;
      }

      // Show loading indicator
      setLoading(true);

      // Get payslips to include (already filtered by selectedSite and selectedMonth)
      const payslipsToInclude = filteredPayslips;

      if (payslipsToInclude.length === 0) {
        alert('No payslips found for the selected site and month');
        setLoading(false);
        return;
      }

      // Generate PDF blob
      const blob = await pdf(
        <SiteWiseSalaryPDFTemplate
          payslips={payslipsToInclude}
          siteName={site.siteName}
          siteCode={site.siteCode}
          month={selectedMonth}
          employees={employees}
        />
      ).toBlob();

      // Download the PDF
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const monthText = selectedMonth.replace('-', '_');
      link.download = `SalarySheet_${site.siteCode}_${monthText}.pdf`;
      link.click();
      URL.revokeObjectURL(url);

      setLoading(false);
    } catch (error) {
      console.error('Error generating site-wise PDF:', error);
      alert('Failed to generate PDF. Please try again.');
      setLoading(false);
    }
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
            <button
              onClick={downloadSiteWisePDF}
              disabled={loading || filteredPayslips.length === 0}
              className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              Download Site PDF
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
                        {payslip.daysPresent} / {payslip.totalDaysInMonth || payslip.totalWorkingDays}
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
                        <button
                          onClick={() => downloadPayslipPDF(payslip)}
                          className="text-red-600 hover:text-red-900"
                          title="Download PDF"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd" />
                          </svg>
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
                value={selectedEmployee?.employee_id || ''}
                onChange={handleEmployeeSelect}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
              >
                <option value="">-- Select Employee --</option>
                {employees.map((emp) => (
                  <option key={emp.employee_id} value={emp.employee_id}>
                    {emp.employee_code} - {emp.first_name} {emp.last_name}
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

          {/* Attendance Information (Read-only - from Attendance module) */}
          {salaryStructure && (
            <>
              {attendanceData ? (
                <div className="border-t pt-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    Attendance Information
                    <span className="ml-2 text-sm text-green-600">(From Attendance Module)</span>
                  </h3>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Total Days in Month:</span>
                        <div className="text-xl font-bold text-gray-900">{attendanceData.total_days_in_month}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Days Present:</span>
                        <div className="text-xl font-bold text-green-600">{attendanceData.days_present}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Attendance %:</span>
                        <div className="text-xl font-bold text-blue-600">
                          {Math.round((attendanceData.days_present / attendanceData.total_days_in_month) * 100)}%
                        </div>
                      </div>
                    </div>
                    {attendanceData.remarks && (
                      <div className="mt-3 text-sm">
                        <span className="text-gray-600">Remarks:</span>
                        <div className="text-gray-800">{attendanceData.remarks}</div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="border-t pt-4">
                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-yellow-700">
                          <strong>No attendance record found!</strong> Please mark attendance for this employee in the selected month before generating a payslip.
                          <br />
                          <span className="text-xs">Go to Attendance module → Mark attendance → Then return here to generate payslip.</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Additional Deductions */}
              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Additional Deductions (Optional)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Advance Deduction</label>
                    <input
                      type="number"
                      name="advance_deduction"
                      value={generateFormData.advance_deduction}
                      onChange={handleGenerateFormChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Remarks</label>
                    <textarea
                      name="remarks"
                      value={generateFormData.remarks}
                      onChange={handleGenerateFormChange}
                      rows="2"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
                      placeholder="Optional remarks..."
                    />
                  </div>
                </div>
              </div>

              {/* Info Box */}
              <div className="border-t pt-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">ℹ️ How Payslip Calculation Works:</h4>
                  <ul className="text-xs text-gray-600 space-y-1">
                    <li>• <strong>Attendance</strong> is fetched automatically from the Attendance module</li>
                    <li>• <strong>Net Salary</strong> = ((Gross Salary - Deductions) / Days in Month) × Days Present</li>
                    <li>• <strong>PF</strong> = ₹1,800 if Basic ≥ ₹15,000, else Basic × 12%</li>
                    <li>• <strong>ESI</strong> = 0.75% of Gross if Gross &lt; ₹21,000, else 0</li>
                    <li>• All calculations are done on the server based on the employee's salary structure</li>
                  </ul>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleGeneratePayslip}
                  disabled={loading || !attendanceData}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed"
                  title={!attendanceData ? 'Attendance record required' : ''}
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
