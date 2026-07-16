import api from '../config/api';

const EMPLOYEE_ENDPOINT = '/employees';

export const employeeService = {
  // Get all employees (with pagination support)
  getAllEmployees: async (params = {}) => {
    const response = await api.get(EMPLOYEE_ENDPOINT, { params });
    return response.data;
  },

  // Get all active employees
  getActiveEmployees: async () => {
    const response = await api.get(`${EMPLOYEE_ENDPOINT}/active`);
    return response.data;
  },

  // Get employees without active salary records
  getEmployeesWithoutSalary: async () => {
    const response = await api.get(`${EMPLOYEE_ENDPOINT}/without-salary`);
    return response.data;
  },

  // Get employee by ID
  getEmployeeById: async (id) => {
    const response = await api.get(`${EMPLOYEE_ENDPOINT}/${id}`);
    return response.data;
  },

  // Get employee by code
  getEmployeeByCode: async (code) => {
    const response = await api.get(`${EMPLOYEE_ENDPOINT}/code/${code}`);
    return response.data;
  },

  // Search employees
  searchEmployees: async (keyword) => {
    const response = await api.get(`${EMPLOYEE_ENDPOINT}/search`, {
      params: { keyword },
    });
    return response.data;
  },

  // Get employees by status
  getEmployeesByStatus: async (status) => {
    const response = await api.get(`${EMPLOYEE_ENDPOINT}/status/${status}`);
    return response.data;
  },

  // Create new employee
  createEmployee: async (employeeData) => {
    const response = await api.post(EMPLOYEE_ENDPOINT, employeeData);
    return response.data;
  },

  // Update employee
  updateEmployee: async (id, employeeData) => {
    const response = await api.put(`${EMPLOYEE_ENDPOINT}/${id}`, employeeData);
    return response.data;
  },

  // Delete employee (soft delete)
  deleteEmployee: async (id) => {
    const response = await api.delete(`${EMPLOYEE_ENDPOINT}/${id}`);
    return response.data;
  },

  // Permanent delete
  permanentDeleteEmployee: async (id) => {
    const response = await api.delete(`${EMPLOYEE_ENDPOINT}/${id}/permanent`);
    return response.data;
  },

  // Upload document
  uploadDocument: async (employeeId, file, documentType) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentType', documentType);

    const response = await api.post(
      `/files/employee/${employeeId}/upload`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  // Get distinct departments
  getDepartments: async () => {
    const response = await api.get(`${EMPLOYEE_ENDPOINT}/departments`);
    return response.data;
  },

  // Get distinct designations
  getDesignations: async () => {
    const response = await api.get(`${EMPLOYEE_ENDPOINT}/designations`);
    return response.data;
  },
};
