import api from './axios';

export const appointmentsApi = {
  list:         (params) => api.get('/appointments', { params }),
  create:       (data)   => api.post('/appointments', data),
  update:       (id, data) => api.put(`/appointments/${id}`, data),
  updateStatus: (id, status) => api.put(`/appointments/${id}/status`, { status }),
  remove:       (id)     => api.delete(`/appointments/${id}`)
};
