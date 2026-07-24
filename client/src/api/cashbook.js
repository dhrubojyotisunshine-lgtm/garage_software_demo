import api from './axios';

export const cashbookApi = {
  stats:   (params)       => api.get('/cashbook/stats', { params }),
  list:    (params)       => api.get('/cashbook', { params }),
  pending: (params)       => api.get('/cashbook/pending', { params }),
  create:  (data)         => api.post('/cashbook', data),
  delete:  (id)           => api.delete(`/cashbook/${id}`)
};
