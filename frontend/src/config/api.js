import axios from 'axios';
import { toast } from 'react-toastify';

// API Base URL
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second
const RETRYABLE_STATUS_CODES = [408, 429, 500, 502, 503, 504];

// Create axios instance with cookie support
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 seconds
  withCredentials: true, // Enable sending cookies with requests
});

// Sleep function for retry delay
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Check if error is retryable
const isRetryableError = (error) => {
  if (!error.response) return true; // Network error - retry
  return RETRYABLE_STATUS_CODES.includes(error.response.status);
};

// Get selected company for SUPER_ADMIN
export const getSelectedCompany = () => {
  const companyStr = localStorage.getItem('selectedCompany');
  if (companyStr) {
    try {
      return JSON.parse(companyStr);
    } catch {
      return null;
    }
  }
  return null;
};

// Set selected company for SUPER_ADMIN
export const setSelectedCompany = (company) => {
  if (company) {
    localStorage.setItem('selectedCompany', JSON.stringify(company));
  } else {
    localStorage.removeItem('selectedCompany');
  }
};

// Request interceptor - Add token and company_id from localStorage
api.interceptors.request.use(
  (config) => {
    // Get token from localStorage and add to headers
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Get user to check if SUPER_ADMIN
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        // If SUPER_ADMIN and a company is selected, add company_id to params
        if (user.role === 'SUPER_ADMIN') {
          const selectedCompany = getSelectedCompany();
          if (selectedCompany) {
            // Add company_id to query params
            config.params = config.params || {};
            config.params.company_id = selectedCompany.company_id;
          }
        }
      } catch {
        // Ignore parse errors
      }
    }

    // Add retry count to config if not present
    config.retryCount = config.retryCount || 0;
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors globally with retry logic
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Don't retry 429 (rate limit) or auth endpoints
    const isAuthEndpoint = originalRequest.url?.includes('/auth/');
    const isRateLimited = error.response?.status === 429;

    // Handle network errors and retryable status codes
    if (!isAuthEndpoint && !isRateLimited && isRetryableError(error) && originalRequest.retryCount < MAX_RETRIES) {
      originalRequest.retryCount += 1;

      // Show retry toast
      toast.info(
        `Request failed. Retrying (${originalRequest.retryCount}/${MAX_RETRIES})...`,
        { autoClose: 2000 }
      );

      // Wait before retry
      await sleep(RETRY_DELAY * originalRequest.retryCount);

      // Retry request
      return api(originalRequest);
    }

    // Handle specific error responses
    if (error.response) {
      const { status, data } = error.response;

      // 401 Unauthorized - Redirect to login
      if (status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');

        // Only show toast if not already on login page
        if (window.location.pathname !== '/login') {
          toast.error('Session expired. Please log in again.');
          window.location.href = '/login';
        }
      }
      // 403 Forbidden
      else if (status === 403) {
        toast.error(data.message || 'Access forbidden. You do not have permission to perform this action.');
      }
      // 404 Not Found
      else if (status === 404) {
        toast.error(data.message || 'The requested resource was not found.');
      }
      // 409 Conflict
      else if (status === 409) {
        toast.warning(data.message || 'A conflict occurred with the current state.');
      }
      // 422 Validation Error
      else if (status === 422) {
        const errorMessages = data.errors?.join(', ') || data.message;
        toast.error(errorMessages || 'Validation failed. Please check your input.');
      }
      // 429 Too Many Requests
      else if (status === 429) {
        toast.error(data.message || 'Too many requests. Please slow down and try again later.');
      }
      // 500+ Server Errors
      else if (status >= 500) {
        toast.error(data.message || 'Server error. Please try again later.');
      }
      // Other 4xx errors
      else if (status >= 400 && status < 500) {
        toast.error(data.message || 'An error occurred processing your request.');
      }

      // Return structured error
      return Promise.reject({
        message: data.message || 'An error occurred',
        status: status,
        data: data,
        errors: data.errors,
      });
    }
    // Network error - no response received
    else if (error.request) {
      toast.error('Network error. Please check your internet connection.');

      return Promise.reject({
        message: 'No response from server. Please check your connection.',
        status: 0,
        isNetworkError: true,
      });
    }
    // Request setup error
    else {
      toast.error(error.message || 'An unexpected error occurred.');

      return Promise.reject({
        message: error.message || 'An unexpected error occurred',
        status: 0,
      });
    }
  }
);

// Helper function to handle API errors with custom messages
export const handleApiError = (error, customMessage = null) => {
  const message = customMessage || error?.message || 'An unexpected error occurred';

  if (!customMessage) {
    // If no custom message, the interceptor already showed a toast
    console.error('API Error:', error);
  } else {
    // Show custom message
    toast.error(message);
  }

  return message;
};

// Success toast helper
export const showSuccess = (message) => {
  toast.success(message);
};

// Info toast helper
export const showInfo = (message) => {
  toast.info(message);
};

// Warning toast helper
export const showWarning = (message) => {
  toast.warning(message);
};

export default api;
