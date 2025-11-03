import api from '../config/api';
import { mockSites, generateSiteCode } from '../mocks/siteMock';

const SITE_ENDPOINT = '/sites';
const USE_MOCK_DATA = false; // Backend is now running!

// Simulate API delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Mock data storage (in-memory)
let mockSiteData = [...mockSites];
let nextId = mockSites.length + 1;

export const siteService = {
  // Get all sites
  getAllSites: async () => {
    if (USE_MOCK_DATA) {
      await delay(500);
      return {
        success: true,
        data: mockSiteData,
        message: 'Sites retrieved successfully (MOCK DATA)',
      };
    }
    const response = await api.get(SITE_ENDPOINT);
    return response.data;
  },

  // Get active sites
  getActiveSites: async () => {
    if (USE_MOCK_DATA) {
      await delay(300);
      const activeSites = mockSiteData.filter(site => site.status === 'ACTIVE');
      return {
        success: true,
        data: activeSites,
        message: 'Active sites retrieved successfully',
      };
    }
    const response = await api.get(`${SITE_ENDPOINT}/active`);
    return response.data;
  },

  // Get site by ID
  getSiteById: async (id) => {
    if (USE_MOCK_DATA) {
      await delay(300);
      const site = mockSiteData.find(s => s.siteId === parseInt(id));
      if (site) {
        return {
          success: true,
          data: site,
          message: 'Site retrieved successfully',
        };
      }
      throw new Error('Site not found');
    }
    const response = await api.get(`${SITE_ENDPOINT}/${id}`);
    return response.data;
  },

  // Search sites
  searchSites: async (keyword) => {
    if (USE_MOCK_DATA) {
      await delay(400);
      const lowerKeyword = keyword.toLowerCase();
      const filtered = mockSiteData.filter(site =>
        site.siteName?.toLowerCase().includes(lowerKeyword) ||
        site.siteCode?.toLowerCase().includes(lowerKeyword) ||
        site.clientName?.toLowerCase().includes(lowerKeyword) ||
        site.siteAddress?.toLowerCase().includes(lowerKeyword)
      );
      return {
        success: true,
        data: filtered,
        message: 'Search completed successfully',
      };
    }
    const response = await api.get(`${SITE_ENDPOINT}/search`, {
      params: { keyword },
    });
    return response.data;
  },

  // Get sites by status
  getSitesByStatus: async (status) => {
    if (USE_MOCK_DATA) {
      await delay(300);
      const filtered = mockSiteData.filter(site => site.status === status);
      return {
        success: true,
        data: filtered,
        message: 'Sites retrieved successfully',
      };
    }
    const response = await api.get(`${SITE_ENDPOINT}/status/${status}`);
    return response.data;
  },

  // Create new site
  createSite: async (siteData) => {
    if (USE_MOCK_DATA) {
      await delay(600);
      const newSite = {
        ...siteData,
        siteId: nextId++,
        siteCode: generateSiteCode(),
        numberOfEmployees: 0,
      };
      mockSiteData.push(newSite);
      return {
        success: true,
        data: newSite,
        message: 'Site created successfully',
      };
    }
    const response = await api.post(SITE_ENDPOINT, siteData);
    return response.data;
  },

  // Update site
  updateSite: async (id, siteData) => {
    if (USE_MOCK_DATA) {
      await delay(600);
      const index = mockSiteData.findIndex(s => s.siteId === parseInt(id));
      if (index !== -1) {
        mockSiteData[index] = {
          ...mockSiteData[index],
          ...siteData,
        };
        return {
          success: true,
          data: mockSiteData[index],
          message: 'Site updated successfully',
        };
      }
      throw new Error('Site not found');
    }
    const response = await api.put(`${SITE_ENDPOINT}/${id}`, siteData);
    return response.data;
  },

  // Delete site (mark as inactive)
  deleteSite: async (id) => {
    if (USE_MOCK_DATA) {
      await delay(400);
      const index = mockSiteData.findIndex(s => s.siteId === parseInt(id));
      if (index !== -1) {
        mockSiteData[index].status = 'INACTIVE';
        return {
          success: true,
          message: 'Site marked as inactive successfully',
        };
      }
      throw new Error('Site not found');
    }
    const response = await api.delete(`${SITE_ENDPOINT}/${id}`);
    return response.data;
  },

  // Get site statistics
  getSiteStats: async () => {
    if (USE_MOCK_DATA) {
      await delay(300);
      const activeSites = mockSiteData.filter(s => s.status === 'ACTIVE');
      const totalEmployees = activeSites.reduce((sum, site) => sum + site.numberOfEmployees, 0);
      const totalValue = mockSiteData.reduce((sum, site) => sum + (site.projectValue || 0), 0);

      return {
        success: true,
        data: {
          totalSites: mockSiteData.length,
          activeSites: activeSites.length,
          completedSites: mockSiteData.filter(s => s.status === 'COMPLETED').length,
          totalEmployeesDeployed: totalEmployees,
          totalProjectValue: totalValue,
        },
        message: 'Site statistics retrieved successfully',
      };
    }
    const response = await api.get(`${SITE_ENDPOINT}/stats`);
    return response.data;
  },
};
