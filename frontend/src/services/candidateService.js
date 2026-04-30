import api from '../config/api';

const CANDIDATE_ENDPOINT = '/candidates';

export const candidateService = {
  // Get all candidates (with pagination support)
  getAllCandidates: async (params = {}) => {
    const response = await api.get(CANDIDATE_ENDPOINT, { params });
    return response.data;
  },

  // Get candidate by ID
  getCandidateById: async (id) => {
    const response = await api.get(`${CANDIDATE_ENDPOINT}/${id}`);
    return response.data;
  },

  // Get next candidate code
  getNextCandidateCode: async () => {
    const response = await api.get(`${CANDIDATE_ENDPOINT}/next-code`);
    return response.data;
  },

  // Get next offer letter reference
  getNextOfferLetterRef: async () => {
    const response = await api.get(`${CANDIDATE_ENDPOINT}/next-offer-ref`);
    return response.data;
  },

  // Create new candidate
  createCandidate: async (candidateData) => {
    const response = await api.post(CANDIDATE_ENDPOINT, candidateData);
    return response.data;
  },

  // Update candidate
  updateCandidate: async (id, candidateData) => {
    const response = await api.put(`${CANDIDATE_ENDPOINT}/${id}`, candidateData);
    return response.data;
  },

  // Delete candidate
  deleteCandidate: async (id) => {
    const response = await api.delete(`${CANDIDATE_ENDPOINT}/${id}`);
    return response.data;
  },

  // Generate offer letter
  generateOfferLetter: async (id, data = {}) => {
    const response = await api.post(`${CANDIDATE_ENDPOINT}/${id}/generate-offer-letter`, data);
    return response.data;
  },

  // Update candidate status
  updateCandidateStatus: async (id, status) => {
    const response = await api.put(`${CANDIDATE_ENDPOINT}/${id}/status`, { status });
    return response.data;
  },

  // Convert candidate to employee
  convertToEmployee: async (id, additionalData) => {
    const response = await api.post(`${CANDIDATE_ENDPOINT}/${id}/convert-to-employee`, additionalData);
    return response.data;
  }
};
