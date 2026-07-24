import api from './axios';

export const expensesApi = {
  list:   (params) => api.get('/expenses', { params }),
  create: (data)   => api.post('/expenses', data),
  update: (id, data) => api.put(`/expenses/${id}`, data),
  remove: (id)     => api.delete(`/expenses/${id}`),
  getOpeningBalance: () => api.get('/expenses/opening-balance'),
  setOpeningBalance: (v) => api.put('/expenses/opening-balance', { openingBalance: v }),
};
