import api from '../config/api';
import { mockEmployees, generateEmployeeCode } from '../mocks/employeeMock';

const EMPLOYEE_ENDPOINT = '/employees';
const USE_MOCK_DATA = false; // Backend is now running!

// Simulate API delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Mock data storage (in-memory)
let mockEmployeeData = [...mockEmployees];
let nextId = mockEmployees.length + 1;

export const employeeService = {
  // Get all employees (with pagination support)
  getAllEmployees: async (params = {}) => {
    if (USE_MOCK_DATA) {
      await delay(500);
      return {
        success: true,
        data: mockEmployeeData,
        message: 'Employees retrieved successfully (MOCK DATA)',
      };
    }
    const response = await api.get(EMPLOYEE_ENDPOINT, { params });
    return response.data;
  },

  // Get all active employees
  getActiveEmployees: async () => {
    if (USE_MOCK_DATA) {
      await delay(300);
      const activeEmployees = mockEmployeeData.filter(emp => emp.status === 'ACTIVE');
      return {
        success: true,
        data: activeEmployees,
        message: 'Active employees retrieved successfully',
      };
    }
    const response = await api.get(`${EMPLOYEE_ENDPOINT}/active`);
    return response.data;
  },

  // Get employee by ID
  getEmployeeById: async (id) => {
    if (USE_MOCK_DATA) {
      await delay(300);
      const employee = mockEmployeeData.find(emp => emp.employeeId === parseInt(id));
      if (employee) {
        return {
          success: true,
          data: employee,
          message: 'Employee retrieved successfully',
        };
      }
      throw new Error('Employee not found');
    }
    const response = await api.get(`${EMPLOYEE_ENDPOINT}/${id}`);
    return response.data;
  },

  // Get employee by code
  getEmployeeByCode: async (code) => {
    if (USE_MOCK_DATA) {
      await delay(300);
      const employee = mockEmployeeData.find(emp => emp.employeeCode === code);
      if (employee) {
        return {
          success: true,
          data: employee,
          message: 'Employee retrieved successfully',
        };
      }
      throw new Error('Employee not found');
    }
    const response = await api.get(`${EMPLOYEE_ENDPOINT}/code/${code}`);
    return response.data;
  },

  // Search employees
  searchEmployees: async (keyword) => {
    if (USE_MOCK_DATA) {
      await delay(400);
      const lowerKeyword = keyword.toLowerCase();
      const filtered = mockEmployeeData.filter(emp =>
        emp.firstName?.toLowerCase().includes(lowerKeyword) ||
        emp.lastName?.toLowerCase().includes(lowerKeyword) ||
        emp.employeeCode?.toLowerCase().includes(lowerKeyword) ||
        emp.mobileNo?.includes(keyword) ||
        emp.email?.toLowerCase().includes(lowerKeyword)
      );
      return {
        success: true,
        data: filtered,
        message: 'Search completed successfully',
      };
    }
    const response = await api.get(`${EMPLOYEE_ENDPOINT}/search`, {
      params: { keyword },
    });
    return response.data;
  },

  // Get employees by status
  getEmployeesByStatus: async (status) => {
    if (USE_MOCK_DATA) {
      await delay(300);
      const filtered = mockEmployeeData.filter(emp => emp.status === status);
      return {
        success: true,
        data: filtered,
        message: 'Employees retrieved successfully',
      };
    }
    const response = await api.get(`${EMPLOYEE_ENDPOINT}/status/${status}`);
    return response.data;
  },

  // Create new employee
  createEmployee: async (employeeData) => {
    if (USE_MOCK_DATA) {
      await delay(600);
      const newEmployee = {
        ...employeeData,
        employeeId: nextId++,
        employeeCode: generateEmployeeCode(),
      };
      mockEmployeeData.push(newEmployee);
      return {
        success: true,
        data: newEmployee,
        message: 'Employee created successfully',
      };
    }
    const response = await api.post(EMPLOYEE_ENDPOINT, employeeData);
    return response.data;
  },

  // Update employee
  updateEmployee: async (id, employeeData) => {
    if (USE_MOCK_DATA) {
      await delay(600);
      const index = mockEmployeeData.findIndex(emp => emp.employeeId === parseInt(id));
      if (index !== -1) {
        mockEmployeeData[index] = {
          ...mockEmployeeData[index],
          ...employeeData,
        };
        return {
          success: true,
          data: mockEmployeeData[index],
          message: 'Employee updated successfully',
        };
      }
      throw new Error('Employee not found');
    }
    const response = await api.put(`${EMPLOYEE_ENDPOINT}/${id}`, employeeData);
    return response.data;
  },

  // Delete employee (soft delete)
  deleteEmployee: async (id) => {
    if (USE_MOCK_DATA) {
      await delay(400);
      const index = mockEmployeeData.findIndex(emp => emp.employeeId === parseInt(id));
      if (index !== -1) {
        mockEmployeeData[index].status = 'RESIGNED';
        mockEmployeeData[index].dateOfLeaving = new Date().toISOString().split('T')[0];
        return {
          success: true,
          message: 'Employee marked as resigned successfully',
        };
      }
      throw new Error('Employee not found');
    }
    const response = await api.delete(`${EMPLOYEE_ENDPOINT}/${id}`);
    return response.data;
  },

  // Permanent delete
  permanentDeleteEmployee: async (id) => {
    if (USE_MOCK_DATA) {
      await delay(400);
      const index = mockEmployeeData.findIndex(emp => emp.employeeId === parseInt(id));
      if (index !== -1) {
        mockEmployeeData.splice(index, 1);
        return {
          success: true,
          message: 'Employee permanently deleted',
        };
      }
      throw new Error('Employee not found');
    }
    const response = await api.delete(`${EMPLOYEE_ENDPOINT}/${id}/permanent`);
    return response.data;
  },

  // Upload document
  uploadDocument: async (employeeId, file, documentType) => {
    if (USE_MOCK_DATA) {
      await delay(800);
      return {
        success: true,
        message: 'Document uploaded successfully (mock)',
      };
    }
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
};
