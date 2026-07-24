import api from './axios';

export const estimatesApi = {
  list: (params) => api.get('/estimates', { params }),
  create: (data) => api.post('/estimates', data),
  getById: (id) => api.get(`/estimates/${id}`),
  update: (id, data) => api.put(`/estimates/${id}`, data),
  delete: (id) => api.delete(`/estimates/${id}`),
  convertToJobcard: (id) => api.post(`/estimates/${id}/convert`)
};
