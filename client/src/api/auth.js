import api from './axios';

export const authApi = {
  register:   (data) => api.post('/auth/register', data),
  verifyOtp:  (data) => api.post('/auth/verify-otp', data),
  login:      (data) => api.post('/auth/login', data),
  staffLogin: (data) => api.post('/auth/staff-login', data),
  logout:     ()     => api.post('/auth/logout'),
  getMe:      ()     => api.get('/auth/me'),
};
