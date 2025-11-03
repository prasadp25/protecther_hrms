import api from '../config/api';
import {
  mockSalaryStructures,
  mockPayslips,
  calculateSalary,
  generatePayslipId,
} from '../mocks/salaryMock';

const SALARY_ENDPOINT = '/salaries';
const PAYSLIP_ENDPOINT = '/payslips';
const USE_MOCK_DATA = false; // Backend is now running!

// Simulate API delay
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Mock data storage (in-memory)
let mockSalaryData = [...mockSalaryStructures];
let mockPayslipData = [...mockPayslips];
let nextSalaryId = mockSalaryStructures.length + 1;

export const salaryService = {
  // ========== SALARY STRUCTURE ENDPOINTS ==========

  // Get all salary structures
  getAllSalaries: async () => {
    if (USE_MOCK_DATA) {
      await delay(400);
      return {
        success: true,
        data: mockSalaryData,
        message: 'Salary structures retrieved successfully (MOCK DATA)',
      };
    }
    const response = await api.get(SALARY_ENDPOINT);
    return response.data;
  },

  // Get salary by employee ID
  getSalaryByEmployeeId: async (employeeId) => {
    if (USE_MOCK_DATA) {
      await delay(300);
      const salary = mockSalaryData.find(
        (sal) => sal.employeeId === parseInt(employeeId) && sal.status === 'ACTIVE'
      );
      if (salary) {
        return {
          success: true,
          data: salary,
          message: 'Salary structure retrieved successfully',
        };
      }
      return {
        success: false,
        message: 'No active salary structure found for this employee',
      };
    }
    const response = await api.get(`${SALARY_ENDPOINT}/employee/${employeeId}`);
    return response.data;
  },

  // Get salary by ID
  getSalaryById: async (salaryId) => {
    if (USE_MOCK_DATA) {
      await delay(300);
      const salary = mockSalaryData.find((sal) => sal.salaryId === parseInt(salaryId));
      if (salary) {
        return {
          success: true,
          data: salary,
          message: 'Salary structure retrieved successfully',
        };
      }
      throw new Error('Salary structure not found');
    }
    const response = await api.get(`${SALARY_ENDPOINT}/${salaryId}`);
    return response.data;
  },

  // Create salary structure
  createSalary: async (salaryData) => {
    if (USE_MOCK_DATA) {
      await delay(500);

      // Calculate gross and net salary
      const grossSalary =
        parseFloat(salaryData.basicSalary || 0) +
        parseFloat(salaryData.hra || 0) +
        parseFloat(salaryData.da || 0) +
        parseFloat(salaryData.conveyanceAllowance || 0) +
        parseFloat(salaryData.medicalAllowance || 0) +
        parseFloat(salaryData.specialAllowance || 0) +
        parseFloat(salaryData.otherAllowances || 0);

      const totalDeductions =
        parseFloat(salaryData.pfDeduction || 0) +
        parseFloat(salaryData.esiDeduction || 0) +
        parseFloat(salaryData.professionalTax || 0) +
        parseFloat(salaryData.tds || 0) +
        parseFloat(salaryData.loanDeduction || 0) +
        parseFloat(salaryData.otherDeductions || 0);

      const netSalary = grossSalary - totalDeductions;

      // Mark existing salary as inactive
      mockSalaryData = mockSalaryData.map((sal) =>
        sal.employeeId === salaryData.employeeId
          ? { ...sal, status: 'INACTIVE' }
          : sal
      );

      const newSalary = {
        ...salaryData,
        salaryId: nextSalaryId++,
        grossSalary,
        totalDeductions,
        netSalary,
        status: 'ACTIVE',
      };

      mockSalaryData.push(newSalary);

      return {
        success: true,
        data: newSalary,
        message: 'Salary structure created successfully',
      };
    }
    const response = await api.post(SALARY_ENDPOINT, salaryData);
    return response.data;
  },

  // Update salary structure
  updateSalary: async (salaryId, salaryData) => {
    if (USE_MOCK_DATA) {
      await delay(500);

      const index = mockSalaryData.findIndex((sal) => sal.salaryId === parseInt(salaryId));
      if (index !== -1) {
        // Recalculate totals
        const grossSalary =
          parseFloat(salaryData.basicSalary || 0) +
          parseFloat(salaryData.hra || 0) +
          parseFloat(salaryData.da || 0) +
          parseFloat(salaryData.conveyanceAllowance || 0) +
          parseFloat(salaryData.medicalAllowance || 0) +
          parseFloat(salaryData.specialAllowance || 0) +
          parseFloat(salaryData.otherAllowances || 0);

        const totalDeductions =
          parseFloat(salaryData.pfDeduction || 0) +
          parseFloat(salaryData.esiDeduction || 0) +
          parseFloat(salaryData.professionalTax || 0) +
          parseFloat(salaryData.tds || 0) +
          parseFloat(salaryData.loanDeduction || 0) +
          parseFloat(salaryData.otherDeductions || 0);

        const netSalary = grossSalary - totalDeductions;

        mockSalaryData[index] = {
          ...mockSalaryData[index],
          ...salaryData,
          grossSalary,
          totalDeductions,
          netSalary,
        };

        return {
          success: true,
          data: mockSalaryData[index],
          message: 'Salary structure updated successfully',
        };
      }
      throw new Error('Salary structure not found');
    }
    const response = await api.put(`${SALARY_ENDPOINT}/${salaryId}`, salaryData);
    return response.data;
  },

  // Delete salary structure
  deleteSalary: async (salaryId) => {
    if (USE_MOCK_DATA) {
      await delay(300);
      const index = mockSalaryData.findIndex((sal) => sal.salaryId === parseInt(salaryId));
      if (index !== -1) {
        mockSalaryData[index].status = 'INACTIVE';
        return {
          success: true,
          message: 'Salary structure deactivated successfully',
        };
      }
      throw new Error('Salary structure not found');
    }
    const response = await api.delete(`${SALARY_ENDPOINT}/${salaryId}`);
    return response.data;
  },

  // ========== PAYSLIP ENDPOINTS ==========

  // Get all payslips
  getAllPayslips: async () => {
    if (USE_MOCK_DATA) {
      await delay(400);
      return {
        success: true,
        data: mockPayslipData,
        message: 'Payslips retrieved successfully (MOCK DATA)',
      };
    }
    const response = await api.get(PAYSLIP_ENDPOINT);
    return response.data;
  },

  // Get payslips by employee ID
  getPayslipsByEmployeeId: async (employeeId) => {
    if (USE_MOCK_DATA) {
      await delay(300);
      const payslips = mockPayslipData.filter(
        (slip) => slip.employeeId === parseInt(employeeId)
      );
      return {
        success: true,
        data: payslips,
        message: 'Payslips retrieved successfully',
      };
    }
    const response = await api.get(`${PAYSLIP_ENDPOINT}/employee/${employeeId}`);
    return response.data;
  },

  // Get payslip by month
  getPayslipByMonth: async (employeeId, month) => {
    if (USE_MOCK_DATA) {
      await delay(300);
      const payslip = mockPayslipData.find(
        (slip) => slip.employeeId === parseInt(employeeId) && slip.month === month
      );
      if (payslip) {
        return {
          success: true,
          data: payslip,
          message: 'Payslip retrieved successfully',
        };
      }
      return {
        success: false,
        message: 'Payslip not found for this month',
      };
    }
    const response = await api.get(`${PAYSLIP_ENDPOINT}/employee/${employeeId}/month/${month}`);
    return response.data;
  },

  // Get payslip by ID
  getPayslipById: async (payslipId) => {
    if (USE_MOCK_DATA) {
      await delay(300);
      const payslip = mockPayslipData.find((slip) => slip.payslipId === parseInt(payslipId));
      if (payslip) {
        return {
          success: true,
          data: payslip,
          message: 'Payslip retrieved successfully',
        };
      }
      throw new Error('Payslip not found');
    }
    const response = await api.get(`${PAYSLIP_ENDPOINT}/${payslipId}`);
    return response.data;
  },

  // Generate payslip
  generatePayslip: async (payslipData) => {
    if (USE_MOCK_DATA) {
      await delay(800);

      const newPayslip = {
        ...payslipData,
        payslipId: generatePayslipId(),
        paymentStatus: 'PENDING',
        paymentDate: null,
        paymentMethod: null,
      };

      mockPayslipData.push(newPayslip);

      return {
        success: true,
        data: newPayslip,
        message: 'Payslip generated successfully',
      };
    }
    const response = await api.post(`${PAYSLIP_ENDPOINT}/generate`, payslipData);
    return response.data;
  },

  // Update payslip payment status
  updatePaymentStatus: async (payslipId, paymentData) => {
    if (USE_MOCK_DATA) {
      await delay(400);
      const index = mockPayslipData.findIndex((slip) => slip.payslipId === parseInt(payslipId));
      if (index !== -1) {
        mockPayslipData[index] = {
          ...mockPayslipData[index],
          ...paymentData,
          paymentDate: new Date().toISOString().split('T')[0],
        };
        return {
          success: true,
          data: mockPayslipData[index],
          message: 'Payment status updated successfully',
        };
      }
      throw new Error('Payslip not found');
    }
    const response = await api.put(`${PAYSLIP_ENDPOINT}/${payslipId}/payment`, paymentData);
    return response.data;
  },

  // Calculate salary helper
  calculateEmployeeSalary: (salaryStructure, workingDays, daysPresent, overtimeHours) => {
    return calculateSalary(salaryStructure, workingDays, daysPresent, overtimeHours);
  },

  // Get payslips by month for all employees
  getPayslipsByMonth: async (month) => {
    if (USE_MOCK_DATA) {
      await delay(400);
      const payslips = mockPayslipData.filter((slip) => slip.month === month);
      return {
        success: true,
        data: payslips,
        message: 'Payslips retrieved successfully',
      };
    }
    const response = await api.get(`${PAYSLIP_ENDPOINT}/month/${month}`);
    return response.data;
  },

  // Get salary summary statistics
  getSalarySummary: async () => {
    if (USE_MOCK_DATA) {
      await delay(300);
      const activeSalaries = mockSalaryData.filter((sal) => sal.status === 'ACTIVE');
      const totalSalaryBurden = activeSalaries.reduce((sum, sal) => sum + sal.netSalary, 0);
      const avgSalary = totalSalaryBurden / activeSalaries.length || 0;
      const maxSalary = Math.max(...activeSalaries.map((sal) => sal.netSalary), 0);
      const minSalary = Math.min(...activeSalaries.map((sal) => sal.netSalary), 0);

      return {
        success: true,
        data: {
          totalEmployees: activeSalaries.length,
          totalSalaryBurden: Math.round(totalSalaryBurden),
          avgSalary: Math.round(avgSalary),
          maxSalary,
          minSalary,
        },
        message: 'Salary summary retrieved successfully',
      };
    }
    const response = await api.get(`${SALARY_ENDPOINT}/summary`);
    return response.data;
  },
};
