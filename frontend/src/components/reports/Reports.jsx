import { useState, useRef } from 'react';
import reportService from '../../services/reportService';
import { showSuccess } from '../../config/api';

const Reports = () => {
  const [activeReport, setActiveReport] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [reportSummary, setReportSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    status: '',
    site_id: ''
  });

  const reportRef = useRef(null);

  const reportTypes = [
    {
      id: 'employee-attendance',
      name: 'Employee Attendance Report',
      description: 'Detailed attendance records for employees',
      category: 'Employee',
      icon: '📅'
    },
    {
      id: 'employee-salary',
      name: 'Employee Salary Report',
      description: 'Comprehensive salary breakdown by employee',
      category: 'Employee',
      icon: '💰'
    },
    {
      id: 'designation',
      name: 'Designation-wise Report',
      description: 'Employee distribution and salary by designation',
      category: 'Employee',
      icon: '👥'
    },
    {
      id: 'site-employees',
      name: 'Site Employee Distribution',
      description: 'Employee count and status by site',
      category: 'Site',
      icon: '🏗️'
    },
    {
      id: 'site-salary-cost',
      name: 'Site Salary Cost Report',
      description: 'Total salary costs per site',
      category: 'Site',
      icon: '💵'
    },
    {
      id: 'monthly-payroll',
      name: 'Monthly Payroll Summary',
      description: 'Complete payroll summary for a month',
      category: 'Payroll',
      icon: '📊'
    },
    {
      id: 'attendance-summary',
      name: 'Attendance Summary',
      description: 'Daily attendance statistics',
      category: 'Attendance',
      icon: '📈'
    }
  ];

  const generateReport = async (reportId) => {
    try {
      setLoading(true);
      setActiveReport(reportId);

      let response;
      const params = {
        month: filters.month,
        year: filters.year,
        status: filters.status,
        site_id: filters.site_id
      };

      switch (reportId) {
        case 'employee-attendance':
          response = await reportService.getEmployeeAttendanceReport(params);
          break;
        case 'employee-salary':
          response = await reportService.getEmployeeSalaryReport(params);
          break;
        case 'designation':
          response = await reportService.getDesignationReport();
          break;
        case 'site-employees':
          response = await reportService.getSiteEmployeeReport({ status: filters.status });
          break;
        case 'site-salary-cost':
          response = await reportService.getSiteSalaryCostReport(params);
          break;
        case 'monthly-payroll':
          response = await reportService.getMonthlyPayrollReport(filters.month, filters.year);
          break;
        case 'attendance-summary':
          response = await reportService.getAttendanceSummaryReport(params);
          break;
        default:
          throw new Error('Invalid report type');
      }

      setReportData(response.data);
      setReportSummary(response.summary);
      showSuccess('Report generated successfully!');
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!reportData || reportData.length === 0) {
      alert('No data to export');
      return;
    }

    const reportType = reportTypes.find(r => r.id === activeReport);
    const filename = `${reportType?.name || 'report'}_${filters.month}_${filters.year}`;

    reportService.exportToCSV(reportData, filename);
    showSuccess('Report exported successfully!');
  };

  const handlePrint = () => {
    if (!reportRef.current) return;
    reportService.printReport(reportRef.current);
  };

  const getReportColumns = (reportId) => {
    switch (reportId) {
      case 'employee-attendance':
        return [
          { key: 'employee_code', label: 'Employee Code' },
          { key: 'first_name', label: 'First Name' },
          { key: 'last_name', label: 'Last Name' },
          { key: 'designation', label: 'Designation' },
          { key: 'site_name', label: 'Site' },
          { key: 'present_days', label: 'Present' },
          { key: 'absent_days', label: 'Absent' },
          { key: 'half_days', label: 'Half Days' },
          { key: 'paid_leaves', label: 'Paid Leaves' },
          { key: 'total_overtime_hours', label: 'OT Hours' }
        ];
      case 'employee-salary':
        return [
          { key: 'employee_code', label: 'Code' },
          { key: 'first_name', label: 'First Name' },
          { key: 'last_name', label: 'Last Name' },
          { key: 'designation', label: 'Designation' },
          { key: 'site_name', label: 'Site' },
          { key: 'basic_salary', label: 'Basic', format: 'currency' },
          { key: 'gross_salary', label: 'Gross', format: 'currency' },
          { key: 'total_deductions', label: 'Deductions', format: 'currency' },
          { key: 'net_salary', label: 'Net Salary', format: 'currency' }
        ];
      case 'designation':
        return [
          { key: 'designation', label: 'Designation' },
          { key: 'employee_count', label: 'Total Employees' },
          { key: 'active_count', label: 'Active' },
          { key: 'avg_salary', label: 'Avg Salary', format: 'currency' },
          { key: 'min_salary', label: 'Min Salary', format: 'currency' },
          { key: 'max_salary', label: 'Max Salary', format: 'currency' },
          { key: 'total_salary_cost', label: 'Total Cost', format: 'currency' }
        ];
      case 'site-employees':
        return [
          { key: 'site_code', label: 'Site Code' },
          { key: 'site_name', label: 'Site Name' },
          { key: 'location', label: 'Location' },
          { key: 'client_name', label: 'Client' },
          { key: 'total_employees', label: 'Total' },
          { key: 'active_employees', label: 'Active' },
          { key: 'resigned_employees', label: 'Resigned' }
        ];
      case 'site-salary-cost':
        return [
          { key: 'site_code', label: 'Code' },
          { key: 'site_name', label: 'Site Name' },
          { key: 'location', label: 'Location' },
          { key: 'employee_count', label: 'Employees' },
          { key: 'total_gross', label: 'Gross Salary', format: 'currency' },
          { key: 'total_deductions', label: 'Deductions', format: 'currency' },
          { key: 'total_net', label: 'Net Salary', format: 'currency' },
          { key: 'avg_salary_per_employee', label: 'Avg/Employee', format: 'currency' }
        ];
      case 'attendance-summary':
        return [
          { key: 'attendance_date', label: 'Date' },
          { key: 'total_employees_marked', label: 'Total Marked' },
          { key: 'present_count', label: 'Present' },
          { key: 'absent_count', label: 'Absent' },
          { key: 'half_day_count', label: 'Half Day' },
          { key: 'paid_leave_count', label: 'Paid Leave' },
          { key: 'total_overtime_hours', label: 'OT Hours' },
          { key: 'attendance_percentage', label: 'Attendance %' }
        ];
      default:
        return [];
    }
  };

  const formatValue = (value, format) => {
    if (value === null || value === undefined) return '-';

    switch (format) {
      case 'currency':
        return `₹${parseFloat(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      default:
        return value;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Reports & Analytics</h2>
        {reportData && (
          <div className="flex gap-2">
            <button
              onClick={handleExportCSV}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2"
            >
              📥 Export CSV
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
            >
              🖨️ Print
            </button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Report Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
            <select
              value={filters.month}
              onChange={(e) => setFilters({ ...filters, month: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {[...Array(12)].map((_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(2000, i).toLocaleString('default', { month: 'long' })}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
            <select
              value={filters.year}
              onChange={(e) => setFilters({ ...filters, year: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {[...Array(5)].map((_, i) => {
                const year = new Date().getFullYear() - i;
                return (
                  <option key={year} value={year}>{year}</option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All</option>
              <option value="ACTIVE">Active</option>
              <option value="RESIGNED">Resigned</option>
              <option value="TERMINATED">Terminated</option>
            </select>
          </div>
        </div>
      </div>

      {/* Report Types Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reportTypes.map(report => (
          <div
            key={report.id}
            className={`bg-white p-6 rounded-lg shadow hover:shadow-lg transition cursor-pointer border-2 ${
              activeReport === report.id ? 'border-blue-500' : 'border-transparent'
            }`}
            onClick={() => generateReport(report.id)}
          >
            <div className="flex items-start gap-4">
              <div className="text-4xl">{report.icon}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-gray-900">{report.name}</h3>
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    {report.category}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{report.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Generating report...</p>
        </div>
      )}

      {/* Report Display */}
      {!loading && reportData && reportData.length > 0 && (
        <div ref={reportRef} className="bg-white p-6 rounded-lg shadow">
          {/* Report Header */}
          <div className="border-b pb-4 mb-4">
            <h3 className="text-xl font-bold text-gray-900">
              {reportTypes.find(r => r.id === activeReport)?.name}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Generated on: {new Date().toLocaleString()}
            </p>
          </div>

          {/* Summary */}
          {reportSummary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {Object.entries(reportSummary).map(([key, value]) => {
                if (key === 'generatedAt') return null;
                return (
                  <div key={key} className="bg-gray-50 p-4 rounded">
                    <p className="text-xs text-gray-600 uppercase">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {typeof value === 'number' && key.toLowerCase().includes('salary')
                        ? formatValue(value, 'currency')
                        : value}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {getReportColumns(activeReport).map(col => (
                    <th
                      key={col.key}
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reportData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    {getReportColumns(activeReport).map(col => (
                      <td key={col.key} className="px-4 py-3 text-sm text-gray-900">
                        {formatValue(row[col.key], col.format)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && reportData && reportData.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-600">No data found for the selected filters</p>
        </div>
      )}
    </div>
  );
};

export default Reports;
