import api from './axios';

export const vehicleSaleApi = {
  list:    (params)   => api.get('/vehicle-sales', { params }),
  get:     (id)       => api.get(`/vehicle-sales/${id}`),
  summary: ()         => api.get('/vehicle-sales/reports/summary'),
  create:  (data)     => api.post('/vehicle-sales', data),
  update:  (id, data) => api.put(`/vehicle-sales/${id}`, data),
  addPayment: (id, data) => api.post(`/vehicle-sales/${id}/payments`, data),
  delete:  (id)       => api.delete(`/vehicle-sales/${id}`)
};
