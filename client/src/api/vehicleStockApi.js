import api from './axios';

export const vehicleStockApi = {
  list:       (params)   => api.get('/vehicle-stock', { params }),
  get:        (id)       => api.get(`/vehicle-stock/${id}`),
  createMany: (items)    => api.post('/vehicle-stock', { items }),
  update:     (id, data) => api.put(`/vehicle-stock/${id}`, data),
  delete:     (id)       => api.delete(`/vehicle-stock/${id}`)
};
