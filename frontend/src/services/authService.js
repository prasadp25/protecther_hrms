import api from '../config/api';

// ==============================================
// AUTHENTICATION SERVICE
// ==============================================

const authService = {
  // Login
  login: async (username, password) => {
    try {
      console.log('🔐 [authService] Attempting login for:', username);
      console.log('🌐 [authService] API URL:', api.defaults.baseURL);

      const response = await api.post('/auth/login', { username, password });

      console.log('✅ [authService] Login response:', response);

      if (response.data.success) {
        // Store token in localStorage for Bearer token authentication
        localStorage.setItem('token', response.data.data.token);
        // Store user data in localStorage for UI convenience
        localStorage.setItem('user', JSON.stringify(response.data.data.user));
        console.log('💾 [authService] Token and user stored in localStorage');
      }

      return response.data;
    } catch (error) {
      console.error('❌ [authService] Login error:', error);
      throw error;
    }
  },

  // Register
  register: async (userData) => {
    try {
      const response = await api.post('/auth/register', userData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Logout
  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear token and user data from localStorage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  },

  // Get current user
  getCurrentUser: async () => {
    try {
      const response = await api.get('/auth/me');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Change password
  changePassword: async (currentPassword, newPassword) => {
    try {
      const response = await api.post('/auth/change-password', {
        currentPassword,
        newPassword,
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Check if user is authenticated (check if user data exists)
  isAuthenticated: () => {
    // User data presence indicates authentication (cookie is httpOnly, can't check directly)
    return !!localStorage.getItem('user');
  },

  // Get stored user data
  getUser: () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },
};

export default authService;
