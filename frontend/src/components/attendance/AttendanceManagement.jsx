import { useState, useEffect } from 'react';
import { attendanceService } from '../../services/attendanceService';
import { employeeService } from '../../services/employeeService';
import { siteService } from '../../services/siteService';
import { salaryService } from '../../services/salaryService';
import * as XLSX from 'xlsx';

const AttendanceManagement = () => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [employees, setEmployees] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]);
  const [sites, setSites] = useState([]);
  const [selectedSite, setSelectedSite] = useState('ALL');
  const [searchKeyword, setSearchKeyword] = useState('');

  // NEW: State for enhanced features
  const [regeneratePayslips, setRegeneratePayslips] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [progressStatus, setProgressStatus] = useState({ current: 0, total: 0, employee: '' });
  const [attendanceFilter, setAttendanceFilter] = useState('ALL'); // ALL, WITH_ATTENDANCE, MISSING_ATTENDANCE
  const [copyingLastMonth, setCopyingLastMonth] = useState(false);
  const [selectedSitePayCycle, setSelectedSitePayCycle] = useState('GROUP_A');

  useEffect(() => {
    loadEmployees();
    loadSites();
  }, []);

  useEffect(() => {
    if (employees.length > 0) {
      loadAttendance();
    }
  }, [selectedMonth, employees]);

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

  // Handle site selection change
  const handleSiteChange = (siteValue) => {
    if (siteValue === 'ALL') {
      setSelectedSite('ALL');
      setSelectedSitePayCycle('GROUP_A'); // Default to Group A for "All Sites"
    } else {
      const siteId = parseInt(siteValue);
      setSelectedSite(siteId);
      // Find the site and get its pay cycle type
      const site = sites.find(s => s.site_id === siteId);
      setSelectedSitePayCycle(site?.pay_cycle_type || 'GROUP_A');
    }
  };

  const loadAttendance = async () => {
    try {
      setLoading(true);
      const response = await attendanceService.getAttendanceByMonth(selectedMonth);

      if (response.success) {
        const attendanceMap = {};
        response.data.forEach((att) => {
          attendanceMap[att.employee_id] = att;
        });

        const data = employees.map((emp) => {
          const existing = attendanceMap[emp.employee_id];
          // Get the employee's site pay cycle type
          const empSite = sites.find(s => s.site_id === emp.site_id);
          const empPayCycle = empSite?.pay_cycle_type || 'GROUP_A';
          const totalDays = existing ? existing.total_days_in_month : getDaysInMonth(empPayCycle);

          return {
            employee_id: emp.employee_id,
            employee_code: emp.employee_code,
            employee_name: `${emp.first_name} ${emp.last_name}`,
            designation: emp.designation,
            site_id: emp.site_id,
            site_name: emp.site_name || 'Unassigned',
            site_pay_cycle: empPayCycle,
            days_present: existing ? existing.days_present : 0,
            total_days_in_month: totalDays,
            remarks: existing ? existing.remarks : '',
            attendance_id: existing ? existing.attendance_id : null,
            status: existing ? existing.status : 'DRAFT'
          };
        });

        setAttendanceData(data);
      }
    } catch (error) {
      console.error('Failed to load attendance:', error);
      alert('Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  };

  // Calculate days based on pay cycle type
  const getDaysInMonth = (payCycleType = null) => {
    const [year, month] = selectedMonth.split('-');
    const cycleType = payCycleType || selectedSitePayCycle;

    if (cycleType === 'GROUP_B') {
      // Group B: 26th of previous month to 25th of current month
      // E.g., December 2025 = Nov 26 to Dec 25
      const prevMonth = parseInt(month) === 1 ? 12 : parseInt(month) - 1;
      const prevYear = parseInt(month) === 1 ? parseInt(year) - 1 : parseInt(year);

      // Days from previous month (26th to end)
      const daysInPrevMonth = new Date(prevYear, prevMonth, 0).getDate();
      const daysFromPrevMonth = daysInPrevMonth - 25; // 26th to end = total - 25

      // Days from current month (1st to 25th)
      const daysFromCurrentMonth = 25;

      return daysFromPrevMonth + daysFromCurrentMonth;
    }

    // Group A: Standard calendar month
    return new Date(year, month, 0).getDate();
  };

  // Get date range text for display
  const getDateRangeText = () => {
    const [year, month] = selectedMonth.split('-');
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                        'July', 'August', 'September', 'October', 'November', 'December'];
    const currentMonthName = monthNames[parseInt(month) - 1];

    if (selectedSitePayCycle === 'GROUP_B') {
      // Previous month name
      const prevMonthIdx = parseInt(month) === 1 ? 11 : parseInt(month) - 2;
      const prevYear = parseInt(month) === 1 ? parseInt(year) - 1 : year;
      const prevMonthName = monthNames[prevMonthIdx];

      return `${prevMonthName} 26 - ${currentMonthName} 25, ${year}`;
    }

    // Group A: Standard month
    const daysInMonth = new Date(year, month, 0).getDate();
    return `${currentMonthName} 1 - ${daysInMonth}, ${year}`;
  };

  const handleDaysChange = (employeeId, value) => {
    const days = parseInt(value) || 0;
    const maxDays = getDaysInMonth();

    setAttendanceData((prev) =>
      prev.map((att) =>
        att.employee_id === employeeId
          ? { ...att, days_present: days }
          : att
      )
    );
  };

  const handleRemarksChange = (employeeId, value) => {
    setAttendanceData((prev) =>
      prev.map((att) =>
        att.employee_id === employeeId
          ? { ...att, remarks: value }
          : att
      )
    );
  };

  // NEW: Validate attendance before saving
  const validateAttendance = () => {
    const warnings = [];
    const daysInMonth = getDaysInMonth();

    filteredAttendance.forEach(att => {
      if (att.days_present > daysInMonth) {
        warnings.push(`${att.employee_name}: Days present (${att.days_present}) exceeds days in month (${daysInMonth})`);
      }
      if (att.days_present === 0) {
        warnings.push(`${att.employee_name}: Days present is 0 (possible mistake?)`);
      }
    });

    return warnings;
  };

  // NEW: Get row highlight class based on validation
  const getRowClassName = (att) => {
    const daysInMonth = getDaysInMonth();
    if (att.days_present > daysInMonth) {
      return 'bg-red-50 hover:bg-red-100';
    }
    if (att.days_present === 0) {
      return 'bg-yellow-50 hover:bg-yellow-100';
    }
    if (att.status === 'FINALIZED') {
      return 'bg-green-50 hover:bg-green-100';
    }
    return 'hover:bg-gray-50';
  };

  // NEW: Check for employees without salary structures
  const checkSalaryStructures = async () => {
    try {
      const response = await salaryService.getAllSalaries({ limit: 500 });
      if (!response.success) return [];

      const salaries = response.data;
      const employeesWithSalary = new Set(
        salaries
          .filter(s => s.status === 'ACTIVE')
          .map(s => s.employee_id)
      );

      // Find employees without salary structures
      const employeesWithoutSalary = filteredAttendance.filter(
        att => !employeesWithSalary.has(att.employee_id)
      );

      return employeesWithoutSalary;
    } catch (error) {
      console.error('Error checking salary structures:', error);
      return [];
    }
  };

  // Show salary structure warning before generating payslips
  const handleSaveClick = async () => {
    // Check if attendance is finalized
    if (!isFinalized) {
      alert('⚠️ Please finalize attendance first before generating payslips.');
      return;
    }

    // Check for employees without salary structures
    const employeesWithoutSalary = await checkSalaryStructures();

    if (employeesWithoutSalary.length > 0) {
      const employeeList = employeesWithoutSalary
        .slice(0, 10)
        .map(emp => `- ${emp.employee_name} (${emp.employee_code})`)
        .join('\n');

      const extraCount = employeesWithoutSalary.length > 10
        ? `\n...and ${employeesWithoutSalary.length - 10} more employees`
        : '';

      const shouldContinue = window.confirm(
        `⚠️ WARNING: ${employeesWithoutSalary.length} employee${employeesWithoutSalary.length > 1 ? 's' : ''} don't have salary structures\n\n` +
        `${employeeList}${extraCount}\n\n` +
        `Payslips will NOT be generated for these employees.\n\n` +
        `Options:\n` +
        `• Click OK to CONTINUE anyway (payslips will fail for these employees)\n` +
        `• Click CANCEL to go to Salary Management and set up salary structures first`
      );

      if (!shouldContinue) {
        // User chose to go to Salary Management
        const goToSalary = window.confirm(
          'Do you want to go to Salary Management now to set up salary structures?'
        );
        if (goToSalary) {
          window.location.hash = '#/salary';
        }
        return; // Don't proceed
      }
    }

    // Proceed to summary modal
    setShowSummaryModal(true);
  };

  const confirmAndSave = async () => {
    setShowSummaryModal(false);
    await handleGeneratePayslips();
  };

  // Save attendance only (without generating payslips)
  const handleSaveOnly = async () => {
    try {
      setSaving(true);

      const records = attendanceData.map((att) => {
        // Get the employee's site pay cycle type to calculate correct total days
        const empSite = sites.find(s => s.site_id === att.site_id);
        const empPayCycle = empSite?.pay_cycle_type || 'GROUP_A';
        const totalDays = getDaysInMonth(empPayCycle);

        return {
          employee_id: att.employee_id,
          days_present: att.days_present,
          total_days_in_month: totalDays,
          remarks: att.remarks || ''
        };
      });

      const response = await attendanceService.saveAttendance(selectedMonth, records);

      if (response.success) {
        alert('✅ Attendance saved successfully!');
        loadAttendance();
      }
    } catch (error) {
      console.error('Failed to save attendance:', error);
      alert('❌ Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  // Generate payslips (requires finalized attendance)
  const handleGeneratePayslips = async () => {
    try {
      setSaving(true);
      await generateBulkPayslips();
    } catch (error) {
      console.error('Failed to generate payslips:', error);
      alert('❌ Failed to generate payslips');
    } finally {
      setSaving(false);
      setProgressStatus({ current: 0, total: 0, employee: '' });
    }
  };

  // Legacy function - kept for compatibility
  const handleSave = async () => {
    await handleSaveOnly();
  };

  // NEW: Enhanced payslip generation with progress tracking and regenerate option
  const generateBulkPayslips = async () => {
    try {
      const [year, month] = selectedMonth.split('-');

      // NEW: Delete existing payslips if regenerate is checked
      if (regeneratePayslips) {
        try {
          await salaryService.deletePayslipsByMonth(selectedMonth);
        } catch (error) {
          console.log('No existing payslips to delete or delete failed');
        }
      }

      let successCount = 0;
      let errorCount = 0;
      const failedEmployees = [];

      const total = filteredAttendance.length;

      for (let i = 0; i < filteredAttendance.length; i++) {
        const att = filteredAttendance[i];

        // NEW: Update progress status
        setProgressStatus({
          current: i + 1,
          total: total,
          employee: `${att.employee_name} (${att.employee_code})`
        });

        try {
          const payslipData = {
            employee_id: att.employee_id,
            month: parseInt(month),
            year: parseInt(year),
            advance_deduction: 0,
            remarks: att.remarks || ''
          };

          const response = await salaryService.generatePayslip(payslipData);
          if (response.success) {
            successCount++;
          }
        } catch (error) {
          errorCount++;
          const errorMsg = error.response?.data?.message || 'Failed';
          failedEmployees.push({
            employee_code: att.employee_code,
            employee_name: att.employee_name,
            error: errorMsg
          });
        }
      }

      if (successCount > 0) {
        await exportPayslipsToExcel(failedEmployees);
      }

      if (errorCount > 0) {
        const failedList = failedEmployees.map(e => `• ${e.employee_name} (${e.employee_code}): ${e.error}`).join('\n');
        const shouldGoToSalary = window.confirm(
          `✅ Success! Generated ${successCount}/${filteredAttendance.length} payslips\n` +
          `⚠️ Failed: ${errorCount} employees\n\n` +
          `Failed Employees:\n${failedList}\n\n` +
          `📥 Excel downloaded with ${successCount} payslips\n\n` +
          `Click OK to go to Salary Management to set up salary structures for failed employees.`
        );

        if (shouldGoToSalary) {
          window.location.hash = '#/salary';
        }
      } else {
        alert(
          `✅ Success! Generated ${successCount} payslips\n\n` +
          `📥 Excel downloaded successfully!`
        );
      }

      loadAttendance();
    } catch (error) {
      console.error('Bulk payslip generation error:', error);
      alert('❌ Failed to generate payslips');
    }
  };

  const exportPayslipsToExcel = async (failedEmployees = []) => {
    try {
      const payslipsResponse = await salaryService.getPayslipsByMonth(selectedMonth);

      if (!payslipsResponse.success || payslipsResponse.data.length === 0) {
        alert('No payslips found to export');
        return;
      }

      const payslips = payslipsResponse.data;
      const payslipsBySite = {};

      payslips.forEach(payslip => {
        const employee = employees.find(emp => emp.employee_id === payslip.employee_id);
        const siteId = employee?.site_id || 'UNASSIGNED';

        if (!payslipsBySite[siteId]) {
          payslipsBySite[siteId] = [];
        }

        payslipsBySite[siteId].push({ employee, payslip });
      });

      const wb = XLSX.utils.book_new();
      const monthName = getMonthName();

      Object.keys(payslipsBySite).forEach(siteId => {
        const siteData = payslipsBySite[siteId];
        const site = sites.find(s => s.site_id === parseInt(siteId));
        const siteName = site ? site.site_name : 'Unassigned';
        const workingDays = siteData[0]?.payslip.total_days_in_month || 30;
        const wsData = [];

        wsData.push([siteName.toUpperCase()]);
        wsData.push([`Statement of Attendance: ${monthName}`, '', '', '', '', `Working Days: ${workingDays}`]);
        wsData.push([
          'Sr No', 'EMP CODE', 'EMP NAME', 'Designation', 'Location', 'Month Days',
          'Days Present', 'Basic', 'HRA', 'Incentive', 'Gross',
          'PF', 'ESI', 'PT', 'Advance', 'Deductions', 'NET PAYABLE', 'Status'
        ]);

        siteData.forEach(({ employee, payslip }, index) => {
          wsData.push([
            index + 1,
            payslip.employee_code,
            `${payslip.first_name || ''} ${payslip.last_name || ''}`.trim(),
            employee?.designation || payslip.designation || '-',
            siteName,
            payslip.total_days_in_month || workingDays,
            payslip.days_present,
            payslip.basic_salary,
            payslip.hra,
            payslip.incentive_allowance || 0,
            payslip.gross_salary,
            payslip.pf_deduction,
            payslip.esi_deduction || 0,
            payslip.professional_tax,
            payslip.advance_deduction || 0,
            payslip.total_deductions,
            payslip.net_salary,
            payslip.payment_status
          ]);
        });

        const totalNet = siteData.reduce((sum, item) => sum + item.payslip.net_salary, 0);
        const totalGross = siteData.reduce((sum, item) => sum + item.payslip.gross_salary, 0);
        const totalDeductions = siteData.reduce((sum, item) => sum + item.payslip.total_deductions, 0);

        wsData.push([
          '', 'TOTAL', '', '', '', '', '',
          '', '', '', totalGross,
          '', '', '', '', totalDeductions, totalNet, ''
        ]);

        const ws = XLSX.utils.aoa_to_sheet(wsData);
        ws['!cols'] = [
          { wch: 6 }, { wch: 12 }, { wch: 20 }, { wch: 15 }, { wch: 15 },
          { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
          { wch: 12 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 10 },
          { wch: 12 }, { wch: 12 }, { wch: 10 }
        ];

        const sheetName = siteName.substring(0, 31);
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
      });

      if (failedEmployees.length > 0) {
        const failedWsData = [];
        failedWsData.push(['⚠️ FAILED EMPLOYEES - NO SALARY STRUCTURE']);
        failedWsData.push(['These employees need salary structure setup before generating payslips']);
        failedWsData.push(['']);
        failedWsData.push(['Sr No', 'Employee Code', 'Employee Name', 'Error Reason', 'Action Required']);

        failedEmployees.forEach((emp, index) => {
          failedWsData.push([
            index + 1,
            emp.employee_code,
            emp.employee_name,
            emp.error,
            'Go to Salary Management → Create Salary Structure'
          ]);
        });

        failedWsData.push(['']);
        failedWsData.push(['📌 Instructions:', 'Go to Salary & Payroll tab → Add New Salary Structure for these employees']);

        const failedWs = XLSX.utils.aoa_to_sheet(failedWsData);
        failedWs['!cols'] = [
          { wch: 8 }, { wch: 15 }, { wch: 25 }, { wch: 40 }, { wch: 50 }
        ];

        XLSX.utils.book_append_sheet(wb, failedWs, '⚠️ FAILED EMPLOYEES');
      }

      const filename = `Payslips_${selectedMonth}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, filename);
    } catch (error) {
      console.error('Export error:', error);
      alert('❌ Failed to export to Excel');
    }
  };

  // NEW: Copy last month's attendance
  const handleCopyLastMonth = async () => {
    // Calculate previous month
    const [year, month] = selectedMonth.split('-');
    const prevDate = new Date(parseInt(year), parseInt(month) - 2, 1);
    const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    const prevMonthName = prevDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const confirmed = window.confirm(
      `📋 COPY ATTENDANCE\n\n` +
      `This will copy attendance data from ${prevMonthName} to ${getMonthName()}.\n\n` +
      `• Only employees with attendance in ${prevMonthName} will be copied\n` +
      `• Days present values will be copied (you can adjust after)\n` +
      `• Employees already with attendance this month will be skipped\n\n` +
      `Continue?`
    );

    if (!confirmed) return;

    try {
      setCopyingLastMonth(true);

      // Load previous month's attendance
      const response = await attendanceService.getAttendanceByMonth(prevMonth);

      if (!response.success || response.data.length === 0) {
        alert(`❌ No attendance data found for ${prevMonthName}`);
        return;
      }

      const prevAttendance = response.data;
      const currentDaysInMonth = getDaysInMonth();
      let copiedCount = 0;
      let skippedCount = 0;

      // Update current month's attendance data
      setAttendanceData(prev => {
        return prev.map(att => {
          // Skip if already has attendance this month
          if (att.days_present > 0 || att.attendance_id) {
            skippedCount++;
            return att;
          }

          // Find previous month data for this employee
          const prevData = prevAttendance.find(p => p.employee_id === att.employee_id);
          if (prevData && prevData.days_present > 0) {
            copiedCount++;
            // Copy days present, but cap at current month's days
            const daysToCopy = Math.min(prevData.days_present, currentDaysInMonth);
            return {
              ...att,
              days_present: daysToCopy,
              total_days_in_month: currentDaysInMonth,
              remarks: `Copied from ${prevMonthName}`
            };
          }
          return att;
        });
      });

      alert(
        `✅ Copy Complete!\n\n` +
        `• Copied: ${copiedCount} employees\n` +
        `• Skipped: ${skippedCount} employees (already have attendance)\n\n` +
        `Review the data and click "Save Attendance" to confirm.`
      );
    } catch (error) {
      console.error('Failed to copy attendance:', error);
      alert('❌ Failed to copy attendance from previous month');
    } finally {
      setCopyingLastMonth(false);
    }
  };

  // NEW: Finalize attendance
  const handleFinalize = async () => {
    const confirmed = window.confirm(
      '⚠️ FINALIZE ATTENDANCE\n\n' +
      'This will lock all attendance records for this month and prevent further editing.\n\n' +
      'Are you sure you want to finalize attendance?'
    );

    if (!confirmed) return;

    try {
      setSaving(true);
      await attendanceService.finalizeAttendance(selectedMonth);
      alert('✅ Attendance finalized successfully!');
      loadAttendance();
    } catch (error) {
      console.error('Failed to finalize attendance:', error);
      alert('❌ Failed to finalize attendance');
    } finally {
      setSaving(false);
    }
  };

  // Apply all filters
  const filteredAttendance = attendanceData.filter((att) => {
    // Filter by site
    if (selectedSite !== 'ALL' && att.site_id !== selectedSite) {
      return false;
    }

    // NEW: Filter by attendance status
    if (attendanceFilter === 'WITH_ATTENDANCE' && att.days_present === 0) {
      return false;
    }
    if (attendanceFilter === 'MISSING_ATTENDANCE' && att.days_present > 0) {
      return false;
    }

    // Filter by search keyword
    if (searchKeyword.trim()) {
      const keyword = searchKeyword.toLowerCase();
      return (
        att.employee_name.toLowerCase().includes(keyword) ||
        att.employee_code.toLowerCase().includes(keyword) ||
        att.site_name.toLowerCase().includes(keyword)
      );
    }

    return true;
  });

  const calculateSummary = () => {
    const totalEmployees = filteredAttendance.length;
    const withAttendance = filteredAttendance.filter(att => att.days_present > 0).length;
    const missingAttendance = totalEmployees - withAttendance;
    const totalDaysPresent = filteredAttendance.reduce((sum, att) => sum + att.days_present, 0);
    const avgDaysPresent = totalEmployees > 0 ? (totalDaysPresent / totalEmployees).toFixed(1) : 0;
    const daysInMonth = getDaysInMonth();
    const attendanceRate = totalEmployees > 0
      ? ((totalDaysPresent / (totalEmployees * daysInMonth)) * 100).toFixed(1)
      : 0;

    return {
      totalEmployees,
      withAttendance,
      missingAttendance,
      totalDaysPresent,
      avgDaysPresent,
      attendanceRate,
      daysInMonth
    };
  };

  const summary = calculateSummary();

  const getMonthName = () => {
    const [year, month] = selectedMonth.split('-');
    const date = new Date(year, month - 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  // Check if any attendance is finalized
  const isFinalized = attendanceData.some(att => att.status === 'FINALIZED');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg shadow-lg p-6 text-white">
        <h2 className="text-3xl font-bold mb-2">Attendance Management</h2>
        <div className="flex items-center gap-2 flex-wrap">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-xl font-semibold">
            Marking Attendance for: <span className="text-yellow-300">{getMonthName()}</span>
          </p>
          {isFinalized && (
            <span className="ml-4 px-3 py-1 bg-green-500 text-white text-sm font-semibold rounded-full">
              ✓ FINALIZED
            </span>
          )}
        </div>
        {/* Pay Cycle Info */}
        <div className="mt-2 flex items-center gap-4 text-sm">
          <span className={`px-3 py-1 rounded-full font-medium ${
            selectedSitePayCycle === 'GROUP_B'
              ? 'bg-orange-500 text-white'
              : 'bg-blue-500 text-white'
          }`}>
            {selectedSitePayCycle === 'GROUP_B' ? 'Group B (26th-25th)' : 'Group A (1st-30th/31st)'}
          </span>
          <span className="text-blue-100">
            Date Range: <span className="font-semibold text-white">{getDateRangeText()}</span>
          </span>
          <span className="text-blue-100">
            Total Days: <span className="font-semibold text-white">{getDaysInMonth()}</span>
          </span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Total Employees</div>
          <div className="text-2xl font-bold text-gray-900">{summary.totalEmployees}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">With Attendance</div>
          <div className="text-2xl font-bold text-green-600">{summary.withAttendance}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Missing Attendance</div>
          <div className="text-2xl font-bold text-red-600">{summary.missingAttendance}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Avg Days Present</div>
          <div className="text-2xl font-bold text-blue-600">{summary.avgDaysPresent}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Attendance Rate</div>
          <div className="text-2xl font-bold text-purple-600">{summary.attendanceRate}%</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
            />
          </div>

          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Site</label>
            <select
              value={selectedSite}
              onChange={(e) => handleSiteChange(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
            >
              <option value="ALL">All Sites</option>
              {sites.map((site) => (
                <option key={site.site_id} value={site.site_id}>
                  {site.site_code} - {site.site_name} {site.pay_cycle_type === 'GROUP_B' ? '(26-25)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              placeholder="Search employee name or code..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
            />
          </div>
        </div>

        {/* NEW: Quick Filter Buttons */}
        <div className="mt-4 flex gap-2 flex-wrap items-center">
          <button
            onClick={() => setAttendanceFilter('ALL')}
            className={`px-4 py-2 rounded-md font-medium ${
              attendanceFilter === 'ALL'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            All Employees
          </button>
          <button
            onClick={() => setAttendanceFilter('WITH_ATTENDANCE')}
            className={`px-4 py-2 rounded-md font-medium ${
              attendanceFilter === 'WITH_ATTENDANCE'
                ? 'bg-green-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            With Attendance ({summary.withAttendance})
          </button>
          <button
            onClick={() => setAttendanceFilter('MISSING_ATTENDANCE')}
            className={`px-4 py-2 rounded-md font-medium ${
              attendanceFilter === 'MISSING_ATTENDANCE'
                ? 'bg-red-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Missing Attendance ({summary.missingAttendance})
          </button>

          {/* Divider */}
          <div className="border-l border-gray-300 h-8 mx-2"></div>

          {/* Copy Last Month Button */}
          <button
            onClick={handleCopyLastMonth}
            disabled={copyingLastMonth || isFinalized || loading}
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-purple-300 font-medium flex items-center gap-2"
            title="Copy attendance from previous month"
          >
            {copyingLastMonth ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Copying...
              </>
            ) : (
              <>📋 Copy Last Month</>
            )}
          </button>
        </div>

        {/* NEW: Regenerate Checkbox and Action Buttons */}
        <div className="mt-4 flex justify-between items-center flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="regenerate"
              checked={regeneratePayslips}
              onChange={(e) => setRegeneratePayslips(e.target.checked)}
              disabled={isFinalized}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="regenerate" className="text-sm font-medium text-gray-700">
              Delete existing payslips and regenerate
            </label>
          </div>

          <div className="flex gap-2">
            {!isFinalized && (
              <>
                <button
                  onClick={handleSaveOnly}
                  disabled={saving || loading}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:bg-gray-300 font-medium"
                >
                  {saving ? 'Saving...' : '💾 Save Attendance'}
                </button>
                <button
                  onClick={handleFinalize}
                  disabled={saving || loading}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-green-300 font-medium"
                >
                  🔒 Finalize Attendance
                </button>
              </>
            )}
            <button
              onClick={handleSaveClick}
              disabled={saving || loading || !isFinalized}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300 font-medium"
              title={!isFinalized ? 'Finalize attendance first before generating payslips' : ''}
            >
              {saving ? 'Processing...' : '📄 Generate Payslips'}
            </button>
          </div>
        </div>
      </div>

      {/* NEW: Progress Indicator */}
      {progressStatus.total > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-blue-900">
              Generating payslips... {progressStatus.current}/{progressStatus.total}
            </div>
            <div className="text-sm text-blue-700">
              {Math.round((progressStatus.current / progressStatus.total) * 100)}%
            </div>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2.5 mb-2">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${(progressStatus.current / progressStatus.total) * 100}%` }}
            ></div>
          </div>
          <div className="text-xs text-blue-600">
            Processing: {progressStatus.employee}
          </div>
        </div>
      )}

      {/* NEW: Summary Modal */}
      {showSummaryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">Attendance Summary - {getMonthName()}</h3>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-gray-50 p-3 rounded">
                <div className="text-sm text-gray-600">Total Employees</div>
                <div className="text-2xl font-bold">{summary.totalEmployees}</div>
              </div>
              <div className="bg-green-50 p-3 rounded">
                <div className="text-sm text-gray-600">With Attendance</div>
                <div className="text-2xl font-bold text-green-600">{summary.withAttendance}</div>
              </div>
              <div className="bg-red-50 p-3 rounded">
                <div className="text-sm text-gray-600">Missing Attendance</div>
                <div className="text-2xl font-bold text-red-600">{summary.missingAttendance}</div>
              </div>
              <div className="bg-blue-50 p-3 rounded">
                <div className="text-sm text-gray-600">Average Days</div>
                <div className="text-2xl font-bold text-blue-600">{summary.avgDaysPresent}</div>
              </div>
            </div>

            {/* Validation Warnings */}
            {validateAttendance().length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4">
                <div className="font-bold text-yellow-800 mb-2">⚠️ Warnings:</div>
                <ul className="text-sm text-yellow-700 list-disc list-inside">
                  {validateAttendance().slice(0, 5).map((warning, idx) => (
                    <li key={idx}>{warning}</li>
                  ))}
                  {validateAttendance().length > 5 && (
                    <li>...and {validateAttendance().length - 5} more warnings</li>
                  )}
                </ul>
              </div>
            )}

            {summary.missingAttendance > 0 && (
              <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
                <div className="font-bold text-red-800">Missing Attendance:</div>
                <div className="text-sm text-red-700 mt-1">
                  {filteredAttendance
                    .filter(att => att.days_present === 0)
                    .slice(0, 5)
                    .map(att => att.employee_name)
                    .join(', ')}
                  {summary.missingAttendance > 5 && ` ...and ${summary.missingAttendance - 5} more`}
                </div>
              </div>
            )}

            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => setShowSummaryModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={confirmAndSave}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Confirm & Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Attendance Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Loading attendance...</p>
          </div>
        ) : filteredAttendance.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">No employees found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Site
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Days Present
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Remarks
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAttendance.map((att) => (
                  <tr key={att.employee_id} className={getRowClassName(att)}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{att.employee_name}</div>
                      <div className="text-sm text-gray-500">{att.employee_code}</div>
                      <div className="text-xs text-gray-400">{att.designation}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{att.site_name}</div>
                      {att.site_pay_cycle === 'GROUP_B' && (
                        <span className="text-xs px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded">
                          26-25
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <input
                        type="number"
                        value={att.days_present}
                        onChange={(e) => handleDaysChange(att.employee_id, e.target.value)}
                        min="0"
                        max={att.total_days_in_month}
                        disabled={att.status === 'FINALIZED'}
                        className="w-20 text-center rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-2 py-1 border disabled:bg-gray-100"
                      />
                      <span className="ml-2 text-sm text-gray-500">/ {att.total_days_in_month}</span>
                    </td>
                    <td className="px-6 py-4">
                      <input
                        type="text"
                        value={att.remarks || ''}
                        onChange={(e) => handleRemarksChange(att.employee_id, e.target.value)}
                        placeholder="Optional remarks..."
                        disabled={att.status === 'FINALIZED'}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-2 py-1 border text-sm disabled:bg-gray-100"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {att.status === 'FINALIZED' ? (
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          ✓ Finalized
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                          Draft
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Legend for row colors */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="text-sm font-medium text-gray-700 mb-2">Legend:</div>
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-100 border border-red-200 rounded"></div>
            <span>Days exceed month total</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-100 border border-yellow-200 rounded"></div>
            <span>Zero days (possible mistake)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-100 border border-green-200 rounded"></div>
            <span>Finalized (locked)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendanceManagement;
