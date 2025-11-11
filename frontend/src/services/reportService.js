import api from '../config/api';

const REPORT_ENDPOINT = '/reports';

export const reportService = {
  // Employee Reports
  getEmployeeAttendanceReport: async (params = {}) => {
    const response = await api.get(`${REPORT_ENDPOINT}/employee/attendance`, { params });
    return response.data;
  },

  getEmployeeSalaryReport: async (params = {}) => {
    const response = await api.get(`${REPORT_ENDPOINT}/employee/salary`, { params });
    return response.data;
  },

  getDesignationReport: async () => {
    const response = await api.get(`${REPORT_ENDPOINT}/designation`);
    return response.data;
  },

  // Site Reports
  getSiteEmployeeReport: async (params = {}) => {
    const response = await api.get(`${REPORT_ENDPOINT}/site/employees`, { params });
    return response.data;
  },

  getSiteSalaryCostReport: async (params = {}) => {
    const response = await api.get(`${REPORT_ENDPOINT}/site/salary-cost`, { params });
    return response.data;
  },

  // Payroll Reports
  getMonthlyPayrollReport: async (month, year) => {
    const response = await api.get(`${REPORT_ENDPOINT}/payroll/monthly`, {
      params: { month, year }
    });
    return response.data;
  },

  getAttendanceSummaryReport: async (params = {}) => {
    const response = await api.get(`${REPORT_ENDPOINT}/attendance/summary`, { params });
    return response.data;
  },

  // Custom Reports
  getCustomDateRangeReport: async (params = {}) => {
    const response = await api.get(`${REPORT_ENDPOINT}/custom/date-range`, { params });
    return response.data;
  },

  // Export Functions
  exportToCSV: (data, filename) => {
    if (!data || data.length === 0) {
      alert('No data to export');
      return;
    }

    // Get headers from first object
    const headers = Object.keys(data[0]);

    // Create CSV content
    let csvContent = headers.join(',') + '\n';

    data.forEach(row => {
      const values = headers.map(header => {
        const value = row[header];
        // Handle values that contain commas or quotes
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      });
      csvContent += values.join(',') + '\n';
    });

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  printReport: (reportElement) => {
    const printWindow = window.open('', '', 'height=600,width=800');
    printWindow.document.write('<html><head><title>Print Report</title>');
    printWindow.document.write('<style>');
    printWindow.document.write(`
      body { font-family: Arial, sans-serif; padding: 20px; }
      table { width: 100%; border-collapse: collapse; margin: 20px 0; }
      th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
      th { background-color: #f2f2f2; font-weight: bold; }
      h1 { color: #333; }
      @media print {
        @page { margin: 0.5in; }
      }
    `);
    printWindow.document.write('</style></head><body>');
    printWindow.document.write(reportElement.innerHTML);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.print();
  }
};

export default reportService;
