import { useState, useEffect } from 'react';
import { attendanceService } from '../../services/attendanceService';

const AttendanceReport = ({ onBack }) => {
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );
  const [summaries, setSummaries] = useState([]);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    loadReport();
  }, [selectedMonth]);

  const loadReport = async () => {
    try {
      setLoading(true);

      // Load monthly summaries for all employees
      const summaryResponse = await attendanceService.getAllMonthlySummaries(
        selectedMonth
      );

      if (summaryResponse.success) {
        setSummaries(summaryResponse.data);
      }

      // Load attendance statistics
      const statsResponse = await attendanceService.getAttendanceStats(
        `${selectedMonth}-01`,
        `${selectedMonth}-31`
      );

      if (statsResponse.success) {
        setStats(statsResponse.data);
      }
    } catch (error) {
      console.error('Failed to load report:', error);
      alert('Failed to load attendance report');
    } finally {
      setLoading(false);
    }
  };

  const getAttendanceGrade = (percentage) => {
    if (percentage >= 95) return { grade: 'A+', color: 'text-green-600' };
    if (percentage >= 90) return { grade: 'A', color: 'text-green-600' };
    if (percentage >= 85) return { grade: 'B+', color: 'text-blue-600' };
    if (percentage >= 80) return { grade: 'B', color: 'text-blue-600' };
    if (percentage >= 75) return { grade: 'C+', color: 'text-yellow-600' };
    if (percentage >= 70) return { grade: 'C', color: 'text-yellow-600' };
    return { grade: 'D', color: 'text-red-600' };
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    // Create CSV content
    const headers = [
      'Employee Code',
      'Employee Name',
      'Total Days',
      'Working Days',
      'Present',
      'Absent',
      'Half Days',
      'Leaves',
      'Holidays',
      'Total Present',
      'Overtime Hours',
      'Late Days',
      'Attendance %',
    ];

    const rows = summaries.map((summary) => [
      summary.employeeCode,
      summary.employeeName,
      summary.totalDays,
      summary.totalWorkingDays,
      summary.presentDays,
      summary.absentDays,
      summary.halfDays,
      summary.leaveDays,
      summary.holidays,
      summary.totalPresent,
      summary.totalOvertimeHours,
      summary.lateDays,
      summary.attendancePercentage,
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `attendance_report_${selectedMonth}.csv`
    );
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center print:hidden">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            ← Back
          </button>
          <h2 className="text-2xl font-bold text-gray-900">Attendance Report</h2>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Export CSV
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Print Report
          </button>
        </div>
      </div>

      {/* Month Selection */}
      <div className="bg-white p-4 rounded-lg shadow print:hidden">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">Select Month:</label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
          />
        </div>
      </div>

      {/* Print Header (only visible when printing) */}
      <div className="hidden print:block mb-6">
        <h1 className="text-3xl font-bold text-center mb-2">Attendance Report</h1>
        <p className="text-center text-gray-600">
          {new Date(selectedMonth + '-01').toLocaleDateString('en-US', {
            month: 'long',
            year: 'numeric',
          })}
        </p>
        <p className="text-center text-sm text-gray-500 mt-2">
          Generated on: {new Date().toLocaleDateString()}
        </p>
      </div>

      {/* Overall Statistics */}
      {stats && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Overall Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div className="text-center p-3 bg-green-50 rounded">
              <div className="text-2xl font-bold text-green-600">{stats.presentCount}</div>
              <div className="text-xs text-gray-600 mt-1">Present</div>
            </div>
            <div className="text-center p-3 bg-red-50 rounded">
              <div className="text-2xl font-bold text-red-600">{stats.absentCount}</div>
              <div className="text-xs text-gray-600 mt-1">Absent</div>
            </div>
            <div className="text-center p-3 bg-yellow-50 rounded">
              <div className="text-2xl font-bold text-yellow-600">{stats.halfDayCount}</div>
              <div className="text-xs text-gray-600 mt-1">Half Days</div>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded">
              <div className="text-2xl font-bold text-blue-600">{stats.leaveCount}</div>
              <div className="text-xs text-gray-600 mt-1">Leaves</div>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded">
              <div className="text-2xl font-bold text-orange-600">
                {stats.totalOvertimeHours}h
              </div>
              <div className="text-xs text-gray-600 mt-1">Total OT</div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded">
              <div className="text-2xl font-bold text-purple-600">{stats.attendanceRate}%</div>
              <div className="text-xs text-gray-600 mt-1">Attendance Rate</div>
            </div>
          </div>
        </div>
      )}

      {/* Employee-wise Report */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Employee-wise Attendance Summary
          </h3>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Loading report...</p>
          </div>
        ) : summaries.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">No attendance data found for this month</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Employee
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    Working Days
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    Present
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    Absent
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    Half Days
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    Leaves
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    Total Present
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    Overtime
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    Late Days
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    Attendance %
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    Grade
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {summaries.map((summary) => {
                  const gradeInfo = getAttendanceGrade(
                    parseFloat(summary.attendancePercentage)
                  );
                  return (
                    <tr key={summary.employeeId} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {summary.employeeName}
                        </div>
                        <div className="text-xs text-gray-500">{summary.employeeCode}</div>
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-gray-900">
                        {summary.totalWorkingDays}
                      </td>
                      <td className="px-4 py-3 text-center text-sm">
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded">
                          {summary.presentDays}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-sm">
                        <span className="px-2 py-1 bg-red-100 text-red-800 rounded">
                          {summary.absentDays}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-sm">
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded">
                          {summary.halfDays}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-sm">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                          {summary.leaveDays}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-sm font-medium text-gray-900">
                        {summary.totalPresent}
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-orange-600 font-medium">
                        {summary.totalOvertimeHours}h
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-red-600">
                        {summary.lateDays}
                      </td>
                      <td className="px-4 py-3 text-center text-sm">
                        <div className="flex items-center justify-center">
                          <div className="w-full max-w-24">
                            <div className="text-sm font-medium text-gray-900 mb-1">
                              {summary.attendancePercentage}%
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${
                                  parseFloat(summary.attendancePercentage) >= 90
                                    ? 'bg-green-500'
                                    : parseFloat(summary.attendancePercentage) >= 75
                                    ? 'bg-yellow-500'
                                    : 'bg-red-500'
                                }`}
                                style={{ width: `${summary.attendancePercentage}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`text-lg font-bold ${gradeInfo.color}`}
                        >
                          {gradeInfo.grade}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="bg-white p-4 rounded-lg shadow print:hidden">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Grading System:</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="font-bold text-green-600">A+/A:</span>
            <span className="text-gray-600">90-100%</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-blue-600">B+/B:</span>
            <span className="text-gray-600">80-89%</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-yellow-600">C+/C:</span>
            <span className="text-gray-600">70-79%</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-red-600">D:</span>
            <span className="text-gray-600">&lt; 70%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendanceReport;
