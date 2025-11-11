import api from '../config/api';

export const attendanceService = {
  // Get attendance records for a specific month
  getAttendanceByMonth: async (month) => {
    try {
      const response = await api.get(`/attendance/month/${month}`);
      return response.data;
    } catch (error) {
      console.error('Get attendance by month error:', error);
      throw error;
    }
  },

  // Get attendance history for a specific employee
  getEmployeeAttendance: async (employeeId) => {
    try {
      const response = await api.get(`/attendance/employee/${employeeId}`);
      return response.data;
    } catch (error) {
      console.error('Get employee attendance error:', error);
      throw error;
    }
  },

  // Save attendance records (bulk)
  saveAttendance: async (month, attendanceRecords) => {
    try {
      const response = await api.post('/attendance/save', {
        month,
        attendanceRecords
      });
      return response.data;
    } catch (error) {
      console.error('Save attendance error:', error);
      throw error;
    }
  },

  // Finalize attendance for a month (lock it)
  finalizeAttendance: async (month) => {
    try {
      const response = await api.post('/attendance/finalize', { month });
      return response.data;
    } catch (error) {
      console.error('Finalize attendance error:', error);
      throw error;
    }
  },

  // Delete attendance record
  deleteAttendance: async (attendanceId) => {
    try {
      const response = await api.delete(`/attendance/${attendanceId}`);
      return response.data;
    } catch (error) {
      console.error('Delete attendance error:', error);
      throw error;
    }
  },

  // Get attendance summary for a month
  getAttendanceSummary: async (month) => {
    try {
      const response = await api.get(`/attendance/summary/${month}`);
      return response.data;
    } catch (error) {
      console.error('Get attendance summary error:', error);
      throw error;
    }
  }
};
