import api from '../config/api';

const SITE_ENDPOINT = '/sites';

export const siteService = {
  // Get all sites
  getAllSites: async () => {
    const response = await api.get(SITE_ENDPOINT);
    return response.data;
  },

  // Get active sites
  getActiveSites: async () => {
    const response = await api.get(`${SITE_ENDPOINT}/active`);
    return response.data;
  },

  // Get site by ID
  getSiteById: async (id) => {
    const response = await api.get(`${SITE_ENDPOINT}/${id}`);
    return response.data;
  },

  // Get sites by status
  getSitesByStatus: async (status) => {
    const response = await api.get(`${SITE_ENDPOINT}/status/${status}`);
    return response.data;
  },

  // Create new site
  createSite: async (siteData) => {
    const response = await api.post(SITE_ENDPOINT, siteData);
    return response.data;
  },

  // Update site
  updateSite: async (id, siteData) => {
    const response = await api.put(`${SITE_ENDPOINT}/${id}`, siteData);
    return response.data;
  },

  // Delete site (mark as inactive)
  deleteSite: async (id) => {
    const response = await api.delete(`${SITE_ENDPOINT}/${id}`);
    return response.data;
  },

  // Get site statistics
  getSiteStats: async () => {
    const response = await api.get(`${SITE_ENDPOINT}/stats`);
    return response.data;
  },
};
