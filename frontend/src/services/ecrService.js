import api from '../config/api';

const ECR_ENDPOINT = '/ecr';

export const ecrService = {
  /**
   * Preview ECR data for a specific month
   * @param {string} month - Month in YYYY-MM format
   * @param {number} companyId - Optional company ID
   * @returns {Promise} ECR preview data
   */
  previewECR: async (month, companyId = null) => {
    const params = companyId ? { company_id: companyId } : {};
    const response = await api.get(`${ECR_ENDPOINT}/preview/${month}`, { params });
    return response.data;
  },

  /**
   * Download ECR text file for a specific month
   * @param {string} month - Month in YYYY-MM format
   * @param {number} companyId - Optional company ID
   * @returns {Promise} Triggers file download
   */
  downloadECR: async (month, companyId = null) => {
    const params = companyId ? { company_id: companyId } : {};
    const response = await api.get(`${ECR_ENDPOINT}/generate/${month}`, {
      params,
      responseType: 'blob'
    });

    // Extract filename from Content-Disposition header or use default
    const contentDisposition = response.headers['content-disposition'];
    let filename = `ECR_${month}.txt`;
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="?([^";\n]+)"?/);
      if (filenameMatch && filenameMatch[1]) {
        filename = filenameMatch[1];
      }
    }

    // Create blob and trigger download
    const blob = new Blob([response.data], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    return { success: true, filename };
  }
};
