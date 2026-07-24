import api from './axios';

export const counterSalesApi = {
  stats:  ()         => api.get('/counter-sales/stats'),
  list:   (params)   => api.get('/counter-sales', { params }),
  get:    (id)       => api.get(`/counter-sales/${id}`),
  create: (data)     => api.post('/counter-sales', data),
  update: (id, data) => api.put(`/counter-sales/${id}`, data),
  delete: (id)       => api.delete(`/counter-sales/${id}`),
  pdfUrl: (id)       => `/counter-sale-print/${id}`
};
