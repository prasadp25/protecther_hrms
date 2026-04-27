import api from '../config/api';

// Create a separate axios instance for employee portal that uses employee token
const EMPLOYEE_TOKEN_KEY = 'employee_token';
const EMPLOYEE_DATA_KEY = 'employee_data';

export const employeePortalService = {
  // Send OTP to employee email
  sendOTP: async (email) => {
    try {
      const response = await api.post('/employee-portal/send-otp', { email });
      return response.data;
    } catch (error) {
      console.error('Send OTP error:', error);
      throw error;
    }
  },

  // Verify OTP and get token
  verifyOTP: async (email, otp) => {
    try {
      const response = await api.post('/employee-portal/verify-otp', { email, otp });
      if (response.data.success && response.data.data) {
        // Store employee token and data
        localStorage.setItem(EMPLOYEE_TOKEN_KEY, response.data.data.token);
        localStorage.setItem(EMPLOYEE_DATA_KEY, JSON.stringify(response.data.data.employee));
      }
      return response.data;
    } catch (error) {
      console.error('Verify OTP error:', error);
      throw error;
    }
  },

  // Get stored employee data
  getStoredEmployee: () => {
    const data = localStorage.getItem(EMPLOYEE_DATA_KEY);
    return data ? JSON.parse(data) : null;
  },

  // Get employee token
  getEmployeeToken: () => {
    return localStorage.getItem(EMPLOYEE_TOKEN_KEY);
  },

  // Check if employee is logged in
  isLoggedIn: () => {
    return !!localStorage.getItem(EMPLOYEE_TOKEN_KEY);
  },

  // Logout employee
  logout: () => {
    localStorage.removeItem(EMPLOYEE_TOKEN_KEY);
    localStorage.removeItem(EMPLOYEE_DATA_KEY);
  },

  // Get employee profile
  getProfile: async () => {
    try {
      const token = localStorage.getItem(EMPLOYEE_TOKEN_KEY);
      const response = await api.get('/employee-portal/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      console.error('Get profile error:', error);
      throw error;
    }
  },

  // Get employee payslips
  getPayslips: async (params = {}) => {
    try {
      const token = localStorage.getItem(EMPLOYEE_TOKEN_KEY);
      const response = await api.get('/employee-portal/payslips', {
        params,
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      console.error('Get payslips error:', error);
      throw error;
    }
  },

  // Get single payslip
  getPayslipById: async (id) => {
    try {
      const token = localStorage.getItem(EMPLOYEE_TOKEN_KEY);
      const response = await api.get(`/employee-portal/payslips/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      console.error('Get payslip error:', error);
      throw error;
    }
  },

  // Get company notices
  getNotices: async () => {
    try {
      const token = localStorage.getItem(EMPLOYEE_TOKEN_KEY);
      const response = await api.get('/employee-portal/notices', {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      console.error('Get notices error:', error);
      throw error;
    }
  },

  // Get insurance info
  getInsurance: async () => {
    try {
      const token = localStorage.getItem(EMPLOYEE_TOKEN_KEY);
      const response = await api.get('/employee-portal/insurance', {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      console.error('Get insurance error:', error);
      throw error;
    }
  },

  // Get employee documents
  getDocuments: async () => {
    try {
      const token = localStorage.getItem(EMPLOYEE_TOKEN_KEY);
      const response = await api.get('/employee-portal/documents', {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      console.error('Get documents error:', error);
      throw error;
    }
  }
};

export default employeePortalService;
