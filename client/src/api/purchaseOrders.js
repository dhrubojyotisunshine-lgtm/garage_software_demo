import api from './axios';

export const purchaseOrdersApi = {
  stats:    ()           => api.get('/purchase-orders/stats'),
  list:     (params)     => api.get('/purchase-orders', { params }),
  get:      (id)         => api.get(`/purchase-orders/${id}`),
  create:   (data)       => api.post('/purchase-orders', data),
  update:   (id, data)   => api.put(`/purchase-orders/${id}`, data),
  addStock: (id)         => api.post(`/purchase-orders/${id}/add-stock`),
  delete:   (id)         => api.delete(`/purchase-orders/${id}`)
};
