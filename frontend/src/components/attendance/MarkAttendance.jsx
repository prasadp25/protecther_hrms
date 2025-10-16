import { useState, useEffect } from 'react';
import { attendanceService } from '../../services/attendanceService';
import { employeeService } from '../../services/employeeService';

const MarkAttendance = ({ onBack }) => {
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [attendanceList, setAttendanceList] = useState([]);
  const [existingAttendance, setExistingAttendance] = useState({});

  useEffect(() => {
    loadEmployees();
  }, []);

  useEffect(() => {
    if (employees.length > 0) {
      loadExistingAttendance();
    }
  }, [selectedDate, employees]);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const response = await employeeService.getActiveEmployees();
      if (response.success) {
        setEmployees(response.data);
        initializeAttendanceList(response.data);
      }
    } catch (error) {
      alert('Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  const loadExistingAttendance = async () => {
    try {
      const response = await attendanceService.getAttendanceByDate(selectedDate);
      if (response.success) {
        const existing = {};
        response.data.forEach((att) => {
          existing[att.employeeId] = att;
        });
        setExistingAttendance(existing);

        // Update attendance list with existing data
        setAttendanceList((prev) =>
          prev.map((item) => {
            const existingAtt = existing[item.employeeId];
            if (existingAtt) {
              return {
                ...item,
                status: existingAtt.status,
                checkIn: existingAtt.checkIn || '',
                checkOut: existingAtt.checkOut || '',
                overtime: existingAtt.overtime || 0,
                remarks: existingAtt.remarks || '',
                isExisting: true,
              };
            }
            return item;
          })
        );
      }
    } catch (error) {
      console.error('Failed to load existing attendance:', error);
    }
  };

  const initializeAttendanceList = (empList) => {
    const list = empList.map((emp) => ({
      employeeId: emp.employeeId,
      employeeCode: emp.employeeCode,
      employeeName: `${emp.firstName} ${emp.lastName}`,
      date: selectedDate,
      status: 'PRESENT',
      checkIn: '09:00',
      checkOut: '18:00',
      workingHours: 9,
      overtime: 0,
      remarks: '',
      markedBy: 'ADMIN',
      isExisting: false,
    }));
    setAttendanceList(list);
  };

  const handleStatusChange = (employeeId, status) => {
    setAttendanceList((prev) =>
      prev.map((item) => {
        if (item.employeeId === employeeId) {
          let updates = { status };

          // Clear time fields for non-working statuses
          if (['ABSENT', 'LEAVE', 'HOLIDAY'].includes(status)) {
            updates.checkIn = '';
            updates.checkOut = '';
            updates.workingHours = 0;
            updates.overtime = 0;
          } else if (status === 'HALF_DAY') {
            updates.checkOut = '14:00';
            updates.workingHours = 4.5;
          } else if (status === 'PRESENT') {
            updates.checkIn = item.checkIn || '09:00';
            updates.checkOut = item.checkOut || '18:00';
            updates.workingHours = 9;
          }

          return { ...item, ...updates };
        }
        return item;
      })
    );
  };

  const handleTimeChange = (employeeId, field, value) => {
    setAttendanceList((prev) =>
      prev.map((item) => {
        if (item.employeeId === employeeId) {
          const updates = { [field]: value };

          // Calculate working hours if both times are available
          if (field === 'checkIn' || field === 'checkOut') {
            const checkIn = field === 'checkIn' ? value : item.checkIn;
            const checkOut = field === 'checkOut' ? value : item.checkOut;

            if (checkIn && checkOut) {
              const [inHour, inMin] = checkIn.split(':').map(Number);
              const [outHour, outMin] = checkOut.split(':').map(Number);

              const inMinutes = inHour * 60 + inMin;
              const outMinutes = outHour * 60 + outMin;
              const totalMinutes = outMinutes - inMinutes;

              updates.workingHours = (totalMinutes / 60).toFixed(2);

              // Calculate overtime (standard work day is 9 hours or 540 minutes)
              if (totalMinutes > 540) {
                updates.overtime = ((totalMinutes - 540) / 60).toFixed(2);
              } else {
                updates.overtime = 0;
              }
            }
          }

          return { ...item, ...updates };
        }
        return item;
      })
    );
  };

  const handleFieldChange = (employeeId, field, value) => {
    setAttendanceList((prev) =>
      prev.map((item) =>
        item.employeeId === employeeId ? { ...item, [field]: value } : item
      )
    );
  };

  const handleMarkAll = (status) => {
    setAttendanceList((prev) =>
      prev.map((item) => {
        let updates = { status };

        if (['ABSENT', 'LEAVE', 'HOLIDAY'].includes(status)) {
          updates.checkIn = '';
          updates.checkOut = '';
          updates.workingHours = 0;
          updates.overtime = 0;
        } else if (status === 'HALF_DAY') {
          updates.checkIn = '09:00';
          updates.checkOut = '14:00';
          updates.workingHours = 4.5;
          updates.overtime = 0;
        } else if (status === 'PRESENT') {
          updates.checkIn = '09:00';
          updates.checkOut = '18:00';
          updates.workingHours = 9;
          updates.overtime = 0;
        }

        return { ...item, ...updates };
      })
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      // Format data for submission
      const formattedData = attendanceList.map((item) => ({
        employeeId: item.employeeId,
        employeeCode: item.employeeCode,
        employeeName: item.employeeName,
        date: selectedDate,
        status: item.status,
        checkIn: item.checkIn ? `${item.checkIn}:00` : null,
        checkOut: item.checkOut ? `${item.checkOut}:00` : null,
        workingHours: parseFloat(item.workingHours) || 0,
        overtime: parseFloat(item.overtime) || 0,
        remarks: item.remarks || '',
        markedBy: 'ADMIN',
      }));

      const response = await attendanceService.markBulkAttendance(formattedData);

      if (response.success) {
        alert(response.message);
        onBack();
      }
    } catch (error) {
      alert('Failed to mark attendance');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'PRESENT':
        return 'bg-green-50 border-green-200';
      case 'ABSENT':
        return 'bg-red-50 border-red-200';
      case 'HALF_DAY':
        return 'bg-yellow-50 border-yellow-200';
      case 'LEAVE':
        return 'bg-blue-50 border-blue-200';
      case 'HOLIDAY':
        return 'bg-gray-50 border-gray-200';
      default:
        return 'bg-white border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Mark Attendance</h2>
        <button
          onClick={onBack}
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
        >
          ← Back to Calendar
        </button>
      </div>

      {/* Date Selection & Bulk Actions */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-64">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
            />
          </div>

          <div className="flex gap-2">
            <span className="text-sm font-medium text-gray-700 self-end pb-2">
              Mark All As:
            </span>
            <button
              onClick={() => handleMarkAll('PRESENT')}
              className="px-3 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
            >
              Present
            </button>
            <button
              onClick={() => handleMarkAll('ABSENT')}
              className="px-3 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700"
            >
              Absent
            </button>
            <button
              onClick={() => handleMarkAll('HOLIDAY')}
              className="px-3 py-2 bg-gray-600 text-white text-sm rounded-md hover:bg-gray-700"
            >
              Holiday
            </button>
          </div>
        </div>
      </div>

      {/* Attendance Form */}
      <form onSubmit={handleSubmit}>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">Loading employees...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Employee
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Check In
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Check Out
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Hours
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Overtime
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Remarks
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {attendanceList.map((item) => (
                    <tr
                      key={item.employeeId}
                      className={`${getStatusColor(item.status)} border-l-4`}
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {item.employeeName}
                        </div>
                        <div className="text-xs text-gray-500">{item.employeeCode}</div>
                        {item.isExisting && (
                          <div className="text-xs text-blue-600 font-medium">
                            Already marked
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <select
                          value={item.status}
                          onChange={(e) =>
                            handleStatusChange(item.employeeId, e.target.value)
                          }
                          className="text-sm rounded border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                        >
                          <option value="PRESENT">Present</option>
                          <option value="ABSENT">Absent</option>
                          <option value="HALF_DAY">Half Day</option>
                          <option value="LEAVE">Leave</option>
                          <option value="HOLIDAY">Holiday</option>
                        </select>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <input
                          type="time"
                          value={item.checkIn}
                          onChange={(e) =>
                            handleTimeChange(item.employeeId, 'checkIn', e.target.value)
                          }
                          disabled={['ABSENT', 'LEAVE', 'HOLIDAY'].includes(item.status)}
                          className="text-sm rounded border-gray-300 focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100"
                        />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <input
                          type="time"
                          value={item.checkOut}
                          onChange={(e) =>
                            handleTimeChange(item.employeeId, 'checkOut', e.target.value)
                          }
                          disabled={['ABSENT', 'LEAVE', 'HOLIDAY'].includes(item.status)}
                          className="text-sm rounded border-gray-300 focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100"
                        />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {item.workingHours}h
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`text-sm font-medium ${
                            item.overtime > 0 ? 'text-orange-600' : 'text-gray-500'
                          }`}
                        >
                          {item.overtime}h
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={item.remarks}
                          onChange={(e) =>
                            handleFieldChange(item.employeeId, 'remarks', e.target.value)
                          }
                          placeholder="Add remarks"
                          className="text-sm rounded border-gray-300 focus:border-blue-500 focus:ring-blue-500 w-full"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="flex justify-end mt-6">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300 font-medium"
          >
            {loading ? 'Saving...' : 'Save Attendance'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default MarkAttendance;
