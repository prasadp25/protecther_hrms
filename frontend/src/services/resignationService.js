import api from '../config/api';

const ENDPOINT = '/resignations';

export const resignationService = {
  list: async (params = {}) => (await api.get(ENDPOINT, { params })).data,
  get: async (id) => (await api.get(`${ENDPOINT}/${id}`)).data,
  raise: async (employeeId, data) => (await api.post(`${ENDPOINT}/employees/${employeeId}`, data)).data,
  approve: async (id, data) => (await api.post(`${ENDPOINT}/${id}/approve`, data)).data,
  reject: async (id, data) => (await api.post(`${ENDPOINT}/${id}/reject`, data)).data,
  relieve: async (id) => (await api.post(`${ENDPOINT}/${id}/relieve`)).data,
  cancel: async (id) => (await api.post(`${ENDPOINT}/${id}/cancel`)).data,
};

export default resignationService;
