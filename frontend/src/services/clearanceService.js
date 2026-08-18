import api from '../config/api';

const ENDPOINT = '/clearances';

export const clearanceService = {
  list: async (params = {}) => (await api.get(ENDPOINT, { params })).data,
  get: async (id) => (await api.get(`${ENDPOINT}/${id}`)).data,
  start: async (employeeId) => (await api.post(`${ENDPOINT}/employees/${employeeId}/start`)).data,
  update: async (id, data) => (await api.put(`${ENDPOINT}/${id}`, data)).data,
  cancel: async (id) => (await api.post(`${ENDPOINT}/${id}/cancel`)).data,
};

export default clearanceService;
