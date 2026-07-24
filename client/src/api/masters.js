import api from './axios';

export const mastersApi = {
  list: (entity, params) => api.get(`/masters/${entity}`, { params }),
  create: (entity, data) => api.post(`/masters/${entity}`, data),
  update: (entity, id, data) => api.put(`/masters/${entity}/${id}`, data),
  delete: (entity, id) => api.delete(`/masters/${entity}/${id}`)
};
