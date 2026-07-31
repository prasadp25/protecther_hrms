import api from '../config/api';

const ENDPOINT = '/advances';

export const advanceService = {
  // List advances (optionally filter by employee_id / status)
  getAdvances: async (params = {}) => {
    const response = await api.get(ENDPOINT, { params });
    return response.data;
  },

  // Record a new advance
  createAdvance: async (data) => {
    const response = await api.post(ENDPOINT, data);
    return response.data;
  },

  // Cancel (waive remaining balance)
  cancelAdvance: async (id) => {
    const response = await api.put(`${ENDPOINT}/${id}/cancel`);
    return response.data;
  },

  // Recovery history for one advance
  getRecoveries: async (id) => {
    const response = await api.get(`${ENDPOINT}/${id}/recoveries`);
    return response.data;
  },
};

export default advanceService;
