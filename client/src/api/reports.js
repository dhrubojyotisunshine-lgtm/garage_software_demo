import api from './axios';

export const reportsApi = {
  fetch: (params) => api.get('/reports', { params })
};
