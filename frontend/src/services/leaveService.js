import api from '../config/api';

const ENDPOINT = '/leaves';

export const leaveService = {
  list: async (params = {}) => (await api.get(ENDPOINT, { params })).data,
  raise: async (employeeId, data) => (await api.post(`${ENDPOINT}/employees/${employeeId}`, data)).data,
  approve: async (id, data = {}) => (await api.post(`${ENDPOINT}/${id}/approve`, data)).data,
  reject: async (id, data = {}) => (await api.post(`${ENDPOINT}/${id}/reject`, data)).data,
  cancel: async (id) => (await api.post(`${ENDPOINT}/${id}/cancel`)).data,
  monthSummary: async (month) => (await api.get(`${ENDPOINT}/month/${month}/summary`)).data,
};

export default leaveService;
