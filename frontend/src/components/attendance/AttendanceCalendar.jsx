import { useState, useEffect } from 'react';
import { attendanceService } from '../../services/attendanceService';
import { employeeService } from '../../services/employeeService';
import {
  getAttendanceStatusColor,
  getAttendanceStatusLabel,
} from '../../mocks/attendanceMock';

const AttendanceCalendar = ({ onMarkAttendance, onViewReports }) => {
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]);
  const [monthlySummary, setMonthlySummary] = useState(null);

  useEffect(() => {
    loadEmployees();
  }, []);

  useEffect(() => {
    if (selectedEmployee) {
      loadAttendance();
    }
  }, [selectedEmployee, selectedMonth]);

  const loadEmployees = async () => {
    try {
      const response = await employeeService.getActiveEmployees();
      if (response.success && response.data.length > 0) {
        setEmployees(response.data);
        setSelectedEmployee(response.data[0].employeeId);
      }
    } catch (error) {
      console.error('Failed to load employees:', error);
    }
  };

  const loadAttendance = async () => {
    try {
      setLoading(true);

      // Get attendance records for the month
      const attendanceResponse = await attendanceService.getAttendanceByEmployee(
        selectedEmployee,
        `${selectedMonth}-01`,
        `${selectedMonth}-31`
      );

      if (attendanceResponse.success) {
        setAttendanceData(attendanceResponse.data);
      }

      // Get monthly summary
      const summaryResponse = await attendanceService.getMonthlySummary(
        selectedEmployee,
        selectedMonth
      );

      if (summaryResponse.success) {
        setMonthlySummary(summaryResponse.data);
      }
    } catch (error) {
      console.error('Failed to load attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAttendanceForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return attendanceData.find((att) => att.date === dateStr);
  };

  const renderCalendar = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();

    const weeks = [];
    let days = [];

    // Add empty cells for days before month starts
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className="p-2 border border-gray-200"></div>);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      const attendance = getAttendanceForDate(date);
      const isToday =
        date.toISOString().split('T')[0] === new Date().toISOString().split('T')[0];
      const isFuture = date > new Date();

      days.push(
        <div
          key={day}
          className={`p-2 border border-gray-200 min-h-20 ${
            isToday ? 'ring-2 ring-blue-500' : ''
          } ${isFuture ? 'bg-gray-50' : 'bg-white'}`}
        >
          <div className="flex justify-between items-start mb-1">
            <span
              className={`text-sm font-semibold ${
                isToday ? 'text-blue-600' : 'text-gray-700'
              }`}
            >
              {day}
            </span>
            {attendance && (
              <span
                className={`w-3 h-3 rounded-full ${getAttendanceStatusColor(
                  attendance.status
                )}`}
                title={getAttendanceStatusLabel(attendance.status)}
              ></span>
            )}
          </div>

          {attendance && (
            <div className="text-xs space-y-1">
              <div
                className={`px-2 py-1 rounded text-white text-center ${getAttendanceStatusColor(
                  attendance.status
                )}`}
              >
                {getAttendanceStatusLabel(attendance.status)}
              </div>

              {attendance.checkIn && (
                <div className="text-gray-600">
                  <span className="font-medium">In:</span> {attendance.checkIn.slice(0, 5)}
                </div>
              )}

              {attendance.checkOut && (
                <div className="text-gray-600">
                  <span className="font-medium">Out:</span> {attendance.checkOut.slice(0, 5)}
                </div>
              )}

              {attendance.overtime > 0 && (
                <div className="text-orange-600 font-medium">
                  OT: {attendance.overtime}h
                </div>
              )}

              {attendance.remarks && (
                <div className="text-red-600 text-xs italic">{attendance.remarks}</div>
              )}
            </div>
          )}

          {!attendance && !isFuture && date.getDay() !== 0 && (
            <div className="text-xs text-gray-400 text-center mt-2">Not marked</div>
          )}
        </div>
      );

      // Start new week
      if ((startDayOfWeek + day) % 7 === 0) {
        weeks.push(
          <div key={`week-${weeks.length}`} className="grid grid-cols-7 gap-0">
            {days}
          </div>
        );
        days = [];
      }
    }

    // Add remaining days
    if (days.length > 0) {
      // Fill remaining cells
      while (days.length < 7) {
        days.push(
          <div key={`empty-end-${days.length}`} className="p-2 border border-gray-200"></div>
        );
      }
      weeks.push(
        <div key={`week-${weeks.length}`} className="grid grid-cols-7 gap-0">
          {days}
        </div>
      );
    }

    return weeks;
  };

  const selectedEmployeeData = employees.find(
    (emp) => emp.employeeId === selectedEmployee
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Attendance Calendar</h2>
        <div className="flex gap-3">
          <button
            onClick={onViewReports}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            View Reports
          </button>
          <button
            onClick={onMarkAttendance}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Mark Attendance
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Employee
            </label>
            <select
              value={selectedEmployee || ''}
              onChange={(e) => setSelectedEmployee(parseInt(e.target.value))}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
            >
              {employees.map((emp) => (
                <option key={emp.employeeId} value={emp.employeeId}>
                  {emp.employeeCode} - {emp.firstName} {emp.lastName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Month</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
            />
          </div>
        </div>
      </div>

      {/* Monthly Summary */}
      {monthlySummary && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded">
              <div className="text-2xl font-bold text-blue-600">
                {monthlySummary.totalWorkingDays}
              </div>
              <div className="text-xs text-gray-600 mt-1">Working Days</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded">
              <div className="text-2xl font-bold text-green-600">
                {monthlySummary.presentDays}
              </div>
              <div className="text-xs text-gray-600 mt-1">Present</div>
            </div>
            <div className="text-center p-3 bg-red-50 rounded">
              <div className="text-2xl font-bold text-red-600">{monthlySummary.absentDays}</div>
              <div className="text-xs text-gray-600 mt-1">Absent</div>
            </div>
            <div className="text-center p-3 bg-yellow-50 rounded">
              <div className="text-2xl font-bold text-yellow-600">
                {monthlySummary.halfDays}
              </div>
              <div className="text-xs text-gray-600 mt-1">Half Days</div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded">
              <div className="text-2xl font-bold text-purple-600">
                {monthlySummary.totalOvertimeHours}h
              </div>
              <div className="text-xs text-gray-600 mt-1">Overtime</div>
            </div>
            <div className="text-center p-3 bg-indigo-50 rounded">
              <div className="text-2xl font-bold text-indigo-600">
                {monthlySummary.attendancePercentage}%
              </div>
              <div className="text-xs text-gray-600 mt-1">Attendance</div>
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Legend:</h3>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-full bg-green-500"></span>
            <span className="text-sm text-gray-600">Present</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-full bg-red-500"></span>
            <span className="text-sm text-gray-600">Absent</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-full bg-yellow-500"></span>
            <span className="text-sm text-gray-600">Half Day</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-full bg-blue-500"></span>
            <span className="text-sm text-gray-600">Leave</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-full bg-gray-400"></span>
            <span className="text-sm text-gray-600">Holiday</span>
          </div>
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Loading attendance...</p>
          </div>
        ) : (
          <div>
            {/* Calendar Header */}
            <div className="bg-gray-100 p-4">
              <h3 className="text-lg font-semibold text-center text-gray-900">
                {new Date(selectedMonth + '-01').toLocaleDateString('en-US', {
                  month: 'long',
                  year: 'numeric',
                })}
              </h3>
              {selectedEmployeeData && (
                <p className="text-center text-sm text-gray-600 mt-1">
                  {selectedEmployeeData.employeeCode} - {selectedEmployeeData.firstName}{' '}
                  {selectedEmployeeData.lastName}
                </p>
              )}
            </div>

            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-0 bg-gray-50 border-b border-gray-200">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div
                  key={day}
                  className="p-3 text-center text-sm font-semibold text-gray-700 border-r border-gray-200 last:border-r-0"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div>{renderCalendar()}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendanceCalendar;
