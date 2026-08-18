import api from '../config/api';

const FNF_ENDPOINT = '/fnf';

export const fnfService = {
  // List settlements (optional { status, employee_id })
  list: async (params = {}) => {
    const response = await api.get(FNF_ENDPOINT, { params });
    return response.data;
  },

  // Fetch a single settlement + its line items
  get: async (fnfId) => {
    const response = await api.get(`${FNF_ENDPOINT}/${fnfId}`);
    return response.data;
  },

  // Create a DRAFT settlement for an employee (auto-populates lines)
  createDraft: async (employeeId, data = {}) => {
    const response = await api.post(`${FNF_ENDPOINT}/employees/${employeeId}/draft`, data);
    return response.data;
  },

  // Update manual lines / LWD / remarks (DRAFT only)
  update: async (fnfId, data) => {
    const response = await api.put(`${FNF_ENDPOINT}/${fnfId}`, data);
    return response.data;
  },

  approve: async (fnfId) => (await api.post(`${FNF_ENDPOINT}/${fnfId}/approve`)).data,
  pay: async (fnfId) => (await api.post(`${FNF_ENDPOINT}/${fnfId}/pay`)).data,
  cancel: async (fnfId) => (await api.post(`${FNF_ENDPOINT}/${fnfId}/cancel`)).data,
};

export default fnfService;
