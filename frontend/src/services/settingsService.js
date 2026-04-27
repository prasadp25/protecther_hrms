import api from '../config/api';

export const settingsService = {
  // Get insurance settings
  getInsuranceSettings: async (params = {}) => {
    try {
      const response = await api.get('/settings/insurance', { params });
      return response.data;
    } catch (error) {
      console.error('Get insurance settings error:', error);
      throw error;
    }
  },

  // Update insurance settings
  updateInsuranceSettings: async (settingsData) => {
    try {
      const response = await api.put('/settings/insurance', settingsData);
      return response.data;
    } catch (error) {
      console.error('Update insurance settings error:', error);
      throw error;
    }
  }
};

export default settingsService;
