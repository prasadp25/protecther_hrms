import api from '../config/api';

export const noticeService = {
  // Get all notices (admin)
  getAllNotices: async (params = {}) => {
    try {
      const response = await api.get('/notices', { params });
      return response.data;
    } catch (error) {
      console.error('Get notices error:', error);
      throw error;
    }
  },

  // Get notice by ID
  getNoticeById: async (id) => {
    try {
      const response = await api.get(`/notices/${id}`);
      return response.data;
    } catch (error) {
      console.error('Get notice error:', error);
      throw error;
    }
  },

  // Create notice
  createNotice: async (noticeData) => {
    try {
      const response = await api.post('/notices', noticeData);
      return response.data;
    } catch (error) {
      console.error('Create notice error:', error);
      throw error;
    }
  },

  // Update notice
  updateNotice: async (id, noticeData) => {
    try {
      const response = await api.put(`/notices/${id}`, noticeData);
      return response.data;
    } catch (error) {
      console.error('Update notice error:', error);
      throw error;
    }
  },

  // Delete notice
  deleteNotice: async (id) => {
    try {
      const response = await api.delete(`/notices/${id}`);
      return response.data;
    } catch (error) {
      console.error('Delete notice error:', error);
      throw error;
    }
  }
};

export default noticeService;
