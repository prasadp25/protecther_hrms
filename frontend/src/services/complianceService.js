import api from '../config/api';

const BASE = '/compliance';

// Statutory registers. company_id is auto-attached for SUPER_ADMIN by the api
// interceptor; ADMIN/HR are scoped to their own company by the backend.
export const complianceService = {
  getBonusRegister: async (params = {}) => (await api.get(`${BASE}/bonus`, { params })).data,
  getBonusFormC: async (params = {}) => (await api.get(`${BASE}/bonus/form-c`, { params })).data,
  getGratuityLiability: async (params = {}) => (await api.get(`${BASE}/gratuity`, { params })).data,
  getPFRegister: async (params = {}) => (await api.get(`${BASE}/pf`, { params })).data,
  getESIRegister: async (params = {}) => (await api.get(`${BASE}/esi`, { params })).data,
  getPTRegister: async (params = {}) => (await api.get(`${BASE}/pt`, { params })).data,
  getEpsExempt: async () => (await api.get(`${BASE}/eps-exempt`)).data,
  setEpsExempt: async (identifiers, exempt) => (await api.post(`${BASE}/eps-exempt`, { identifiers, exempt })).data,
};

export default complianceService;
