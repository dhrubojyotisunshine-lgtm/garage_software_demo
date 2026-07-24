import api from './axios';

export const customersApi = {
  list: (params) => api.get('/customers', { params }),
  search: (q) => api.get('/customers/search', { params: { q } }),
  create: (data) => api.post('/customers', data),
  update: (id, data) => api.put(`/customers/${id}`, data),
  getById: (id) => api.get(`/customers/${id}`),
  getJobcards:  (customerId, params) => api.get('/jobcards', { params: { customerId, limit: 100, ...params } }),
  addNote:      (id, text)  => api.post(`/customers/${id}/notes`, { text }),
  setFollowUp:  (id, data)  => api.put(`/customers/${id}/followup`, data),
};
