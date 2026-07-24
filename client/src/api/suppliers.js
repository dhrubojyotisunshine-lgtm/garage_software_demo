import api from './axios';

export const suppliersApi = {
  list:   (params) => api.get('/suppliers', { params }),
  get:    (id)     => api.get(`/suppliers/${id}`),
  ledger: (id, params) => api.get(`/suppliers/${id}/ledger`, { params }),
  create: (data)   => api.post('/suppliers', data),
  update: (id, data) => api.put(`/suppliers/${id}`, data),
  delete: (id)     => api.delete(`/suppliers/${id}`)
};
