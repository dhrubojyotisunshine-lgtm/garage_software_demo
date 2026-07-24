import api from './axios';

export const partyApi = {
  list:   (params)   => api.get('/party', { params }),
  get:    (id)       => api.get(`/party/${id}`),
  create: (data)     => api.post('/party', data),
  update: (id, data) => api.put(`/party/${id}`, data),
  delete: (id)       => api.delete(`/party/${id}`)
};
