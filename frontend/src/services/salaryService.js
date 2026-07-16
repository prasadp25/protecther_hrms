import api from '../config/api';

const SALARY_ENDPOINT = '/salaries';
const PAYSLIP_ENDPOINT = '/payslips';

export const salaryService = {
  // ========== SALARY STRUCTURE ENDPOINTS ==========

  // Get all salary structures
  getAllSalaries: async () => {
    // Request all records (limit=500) to show all employees
    const response = await api.get(`${SALARY_ENDPOINT}?limit=500`);
    return response.data;
  },

  // Get salary by employee ID
  getSalaryByEmployeeId: async (employeeId) => {
    const response = await api.get(`${SALARY_ENDPOINT}/employee/${employeeId}`);
    return response.data;
  },

  // Get salary by ID
  getSalaryById: async (salaryId) => {
    const response = await api.get(`${SALARY_ENDPOINT}/${salaryId}`);
    return response.data;
  },

  // Create salary structure
  createSalary: async (salaryData) => {
    const response = await api.post(SALARY_ENDPOINT, salaryData);
    return response.data;
  },

  // Update salary structure
  updateSalary: async (salaryId, salaryData) => {
    const response = await api.put(`${SALARY_ENDPOINT}/${salaryId}`, salaryData);
    return response.data;
  },

  // Delete salary structure
  deleteSalary: async (salaryId) => {
    const response = await api.delete(`${SALARY_ENDPOINT}/${salaryId}`);
    return response.data;
  },

  // ========== PAYSLIP ENDPOINTS ==========

  // Get all payslips
  getAllPayslips: async () => {
    const response = await api.get(PAYSLIP_ENDPOINT);
    return response.data;
  },

  // Get payslips by employee ID
  getPayslipsByEmployeeId: async (employeeId) => {
    const response = await api.get(`${PAYSLIP_ENDPOINT}/employee/${employeeId}`);
    return response.data;
  },

  // Get payslip by month
  getPayslipByMonth: async (employeeId, month) => {
    const response = await api.get(`${PAYSLIP_ENDPOINT}/employee/${employeeId}/month/${month}`);
    return response.data;
  },

  // Get payslip by ID
  getPayslipById: async (payslipId) => {
    const response = await api.get(`${PAYSLIP_ENDPOINT}/${payslipId}`);
    return response.data;
  },

  // Generate payslip
  generatePayslip: async (payslipData) => {
    const response = await api.post(`${PAYSLIP_ENDPOINT}/generate`, payslipData);
    return response.data;
  },

  // Bulk generate payslips for all employees with finalized attendance
  bulkGeneratePayslips: async (data) => {
    const response = await api.post(`${PAYSLIP_ENDPOINT}/generate/bulk`, data);
    return response.data;
  },

  // Update payslip payment status
  updatePaymentStatus: async (payslipId, paymentData) => {
    const response = await api.put(`${PAYSLIP_ENDPOINT}/${payslipId}/payment-status`, paymentData);
    return response.data;
  },

  // Get payslips by month for all employees
  getPayslipsByMonth: async (month) => {
    const response = await api.get(`${PAYSLIP_ENDPOINT}/month/${month}`);
    return response.data;
  },

  // Get salary summary statistics
  getSalarySummary: async () => {
    const response = await api.get(`${SALARY_ENDPOINT}/summary`);
    return response.data;
  },

  // Delete all payslips for a specific month
  deletePayslipsByMonth: async (month) => {
    const response = await api.delete(`${PAYSLIP_ENDPOINT}/month/${month}`);
    return response.data;
  },
};
