import api from './api';
import {
  mockAttendanceRecords,
  mockHolidays,
  calculateMonthlySummary,
} from '../mocks/attendanceMock';

const ATTENDANCE_ENDPOINT = '/attendance';
const USE_MOCK_DATA = true; // Set to false when backend is running

// Simulate API delay
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Mock data storage (in-memory)
let mockAttendanceData = [...mockAttendanceRecords];
let nextAttendanceId = mockAttendanceRecords.length + 1;

export const attendanceService = {
  // ========== ATTENDANCE MARKING ==========

  // Mark attendance for a single employee
  markAttendance: async (attendanceData) => {
    if (USE_MOCK_DATA) {
      await delay(400);

      // Check if attendance already marked for this date
      const existingIndex = mockAttendanceData.findIndex(
        (att) =>
          att.employeeId === attendanceData.employeeId &&
          att.date === attendanceData.date
      );

      if (existingIndex !== -1) {
        // Update existing record
        mockAttendanceData[existingIndex] = {
          ...mockAttendanceData[existingIndex],
          ...attendanceData,
          markedAt: new Date().toISOString(),
        };

        return {
          success: true,
          data: mockAttendanceData[existingIndex],
          message: 'Attendance updated successfully',
        };
      } else {
        // Create new record
        const newRecord = {
          ...attendanceData,
          attendanceId: nextAttendanceId++,
          markedAt: new Date().toISOString(),
        };

        mockAttendanceData.push(newRecord);

        return {
          success: true,
          data: newRecord,
          message: 'Attendance marked successfully',
        };
      }
    }
    const response = await api.post(ATTENDANCE_ENDPOINT, attendanceData);
    return response.data;
  },

  // Mark bulk attendance (multiple employees for a date)
  markBulkAttendance: async (attendanceList) => {
    if (USE_MOCK_DATA) {
      await delay(600);

      const results = [];

      attendanceList.forEach((attendanceData) => {
        const existingIndex = mockAttendanceData.findIndex(
          (att) =>
            att.employeeId === attendanceData.employeeId &&
            att.date === attendanceData.date
        );

        if (existingIndex !== -1) {
          mockAttendanceData[existingIndex] = {
            ...mockAttendanceData[existingIndex],
            ...attendanceData,
            markedAt: new Date().toISOString(),
          };
          results.push(mockAttendanceData[existingIndex]);
        } else {
          const newRecord = {
            ...attendanceData,
            attendanceId: nextAttendanceId++,
            markedAt: new Date().toISOString(),
          };
          mockAttendanceData.push(newRecord);
          results.push(newRecord);
        }
      });

      return {
        success: true,
        data: results,
        message: `Attendance marked for ${results.length} employees`,
      };
    }
    const response = await api.post(`${ATTENDANCE_ENDPOINT}/bulk`, attendanceList);
    return response.data;
  },

  // ========== ATTENDANCE RETRIEVAL ==========

  // Get attendance by employee ID and date range
  getAttendanceByEmployee: async (employeeId, startDate, endDate) => {
    if (USE_MOCK_DATA) {
      await delay(300);

      let filtered = mockAttendanceData.filter(
        (att) => att.employeeId === parseInt(employeeId)
      );

      if (startDate) {
        filtered = filtered.filter((att) => att.date >= startDate);
      }

      if (endDate) {
        filtered = filtered.filter((att) => att.date <= endDate);
      }

      return {
        success: true,
        data: filtered.sort((a, b) => new Date(b.date) - new Date(a.date)),
        message: 'Attendance records retrieved successfully',
      };
    }
    const response = await api.get(
      `${ATTENDANCE_ENDPOINT}/employee/${employeeId}`,
      {
        params: { startDate, endDate },
      }
    );
    return response.data;
  },

  // Get attendance by date
  getAttendanceByDate: async (date) => {
    if (USE_MOCK_DATA) {
      await delay(300);

      const filtered = mockAttendanceData.filter((att) => att.date === date);

      return {
        success: true,
        data: filtered,
        message: 'Attendance records retrieved successfully',
      };
    }
    const response = await api.get(`${ATTENDANCE_ENDPOINT}/date/${date}`);
    return response.data;
  },

  // Get attendance by month
  getAttendanceByMonth: async (month) => {
    if (USE_MOCK_DATA) {
      await delay(400);

      const filtered = mockAttendanceData.filter((att) =>
        att.date.startsWith(month)
      );

      return {
        success: true,
        data: filtered,
        message: 'Attendance records retrieved successfully',
      };
    }
    const response = await api.get(`${ATTENDANCE_ENDPOINT}/month/${month}`);
    return response.data;
  },

  // Get all attendance records
  getAllAttendance: async () => {
    if (USE_MOCK_DATA) {
      await delay(500);
      return {
        success: true,
        data: mockAttendanceData,
        message: 'All attendance records retrieved successfully (MOCK DATA)',
      };
    }
    const response = await api.get(ATTENDANCE_ENDPOINT);
    return response.data;
  },

  // ========== ATTENDANCE SUMMARY ==========

  // Get monthly summary for an employee
  getMonthlySummary: async (employeeId, month) => {
    if (USE_MOCK_DATA) {
      await delay(300);

      const summary = calculateMonthlySummary(
        employeeId,
        month,
        mockAttendanceData
      );

      return {
        success: true,
        data: summary,
        message: 'Monthly summary calculated successfully',
      };
    }
    const response = await api.get(
      `${ATTENDANCE_ENDPOINT}/summary/employee/${employeeId}/month/${month}`
    );
    return response.data;
  },

  // Get monthly summary for all employees
  getAllMonthlySummaries: async (month) => {
    if (USE_MOCK_DATA) {
      await delay(400);

      // Get unique employee IDs
      const employeeIds = [
        ...new Set(mockAttendanceData.map((att) => att.employeeId)),
      ];

      const summaries = employeeIds.map((empId) =>
        calculateMonthlySummary(empId, month, mockAttendanceData)
      );

      // Add employee names
      summaries.forEach((summary) => {
        const record = mockAttendanceData.find(
          (att) => att.employeeId === summary.employeeId
        );
        if (record) {
          summary.employeeCode = record.employeeCode;
          summary.employeeName = record.employeeName;
        }
      });

      return {
        success: true,
        data: summaries,
        message: 'Monthly summaries retrieved successfully',
      };
    }
    const response = await api.get(
      `${ATTENDANCE_ENDPOINT}/summary/month/${month}`
    );
    return response.data;
  },

  // ========== ATTENDANCE UPDATES ==========

  // Update attendance record
  updateAttendance: async (attendanceId, updates) => {
    if (USE_MOCK_DATA) {
      await delay(400);

      const index = mockAttendanceData.findIndex(
        (att) => att.attendanceId === parseInt(attendanceId)
      );

      if (index !== -1) {
        mockAttendanceData[index] = {
          ...mockAttendanceData[index],
          ...updates,
          markedAt: new Date().toISOString(),
        };

        return {
          success: true,
          data: mockAttendanceData[index],
          message: 'Attendance updated successfully',
        };
      }

      throw new Error('Attendance record not found');
    }
    const response = await api.put(
      `${ATTENDANCE_ENDPOINT}/${attendanceId}`,
      updates
    );
    return response.data;
  },

  // Delete attendance record
  deleteAttendance: async (attendanceId) => {
    if (USE_MOCK_DATA) {
      await delay(300);

      const index = mockAttendanceData.findIndex(
        (att) => att.attendanceId === parseInt(attendanceId)
      );

      if (index !== -1) {
        mockAttendanceData.splice(index, 1);
        return {
          success: true,
          message: 'Attendance record deleted successfully',
        };
      }

      throw new Error('Attendance record not found');
    }
    const response = await api.delete(`${ATTENDANCE_ENDPOINT}/${attendanceId}`);
    return response.data;
  },

  // ========== HOLIDAYS ==========

  // Get all holidays
  getHolidays: async () => {
    if (USE_MOCK_DATA) {
      await delay(200);
      return {
        success: true,
        data: mockHolidays,
        message: 'Holidays retrieved successfully',
      };
    }
    const response = await api.get(`${ATTENDANCE_ENDPOINT}/holidays`);
    return response.data;
  },

  // Check if date is holiday
  isHoliday: async (date) => {
    if (USE_MOCK_DATA) {
      const holiday = mockHolidays.find((h) => h.date === date);
      return {
        success: true,
        data: { isHoliday: !!holiday, holiday },
        message: holiday ? 'Date is a holiday' : 'Date is not a holiday',
      };
    }
    const response = await api.get(`${ATTENDANCE_ENDPOINT}/holidays/check/${date}`);
    return response.data;
  },

  // ========== ANALYTICS ==========

  // Get attendance statistics
  getAttendanceStats: async (startDate, endDate) => {
    if (USE_MOCK_DATA) {
      await delay(400);

      let filtered = mockAttendanceData;

      if (startDate) {
        filtered = filtered.filter((att) => att.date >= startDate);
      }

      if (endDate) {
        filtered = filtered.filter((att) => att.date <= endDate);
      }

      const totalRecords = filtered.length;
      const presentCount = filtered.filter((att) => att.status === 'PRESENT').length;
      const absentCount = filtered.filter((att) => att.status === 'ABSENT').length;
      const halfDayCount = filtered.filter((att) => att.status === 'HALF_DAY').length;
      const leaveCount = filtered.filter((att) => att.status === 'LEAVE').length;
      const holidayCount = filtered.filter((att) => att.status === 'HOLIDAY').length;

      const totalOvertimeHours = filtered.reduce(
        (sum, att) => sum + att.overtime,
        0
      );

      const lateCount = filtered.filter(
        (att) => att.remarks && att.remarks.includes('Late')
      ).length;

      return {
        success: true,
        data: {
          totalRecords,
          presentCount,
          absentCount,
          halfDayCount,
          leaveCount,
          holidayCount,
          totalOvertimeHours: totalOvertimeHours.toFixed(2),
          lateCount,
          attendanceRate: ((presentCount / (totalRecords - holidayCount)) * 100).toFixed(2),
        },
        message: 'Attendance statistics calculated successfully',
      };
    }
    const response = await api.get(`${ATTENDANCE_ENDPOINT}/stats`, {
      params: { startDate, endDate },
    });
    return response.data;
  },
};
