import api from '../config/api';

const COMPANY_ENDPOINT = '/companies';

export const companyService = {
  // Get all companies (SUPER_ADMIN only)
  getAllCompanies: async (params = {}) => {
    const response = await api.get(COMPANY_ENDPOINT, { params });
    return response.data;
  },

  // Get active companies (for dropdowns)
  getActiveCompanies: async () => {
    const response = await api.get(`${COMPANY_ENDPOINT}/active`);
    return response.data;
  },

  // Get companies summary (for dashboard)
  getCompaniesSummary: async () => {
    const response = await api.get(`${COMPANY_ENDPOINT}/summary`);
    return response.data;
  },

  // Get company by ID
  getCompanyById: async (id) => {
    const response = await api.get(`${COMPANY_ENDPOINT}/${id}`);
    return response.data;
  },

  // Get company statistics
  getCompanyStats: async (id) => {
    const response = await api.get(`${COMPANY_ENDPOINT}/${id}/stats`);
    return response.data;
  },

  // Create new company (SUPER_ADMIN only)
  createCompany: async (companyData) => {
    const response = await api.post(COMPANY_ENDPOINT, companyData);
    return response.data;
  },

  // Update company (SUPER_ADMIN only)
  updateCompany: async (id, companyData) => {
    const response = await api.put(`${COMPANY_ENDPOINT}/${id}`, companyData);
    return response.data;
  },

  // Delete company (SUPER_ADMIN only)
  deleteCompany: async (id) => {
    const response = await api.delete(`${COMPANY_ENDPOINT}/${id}`);
    return response.data;
  },
};
