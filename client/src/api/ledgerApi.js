import api from './axios';

export const ledgerApi = {
  list:   (params)   => api.get('/ledger', { params }),
  get:    (id)       => api.get(`/ledger/${id}`),
  party:  (name, params) => api.get(`/ledger/party/${encodeURIComponent(name)}`, { params }),
  partyById: (partyId, params) => api.get(`/ledger/by-party/${partyId}`, { params }),
  create: (data)     => api.post('/ledger', data),
  update: (id, data) => api.put(`/ledger/${id}`, data),
  delete: (id)       => api.delete(`/ledger/${id}`)
};
