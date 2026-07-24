import axios from 'axios';

const api = axios.create({
  // Same-origin '/api' by default (local dev proxy / single-service deploy).
  // For a separately hosted client, set VITE_API_URL to the server's /api URL.
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 30000
});

api.interceptors.request.use((config) => {
  // Don't overwrite an Authorization header that a caller set explicitly
  // (e.g. super-admin requests use their own ttn_sa_token). Only fall back to
  // the garage/staff token when no auth header is already present.
  if (!config.headers.Authorization && !config.headers.authorization) {
    const token = localStorage.getItem('ttn_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('ttn_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
