import api from './axios';

export const jobcardsApi = {
  list: (params) => api.get('/jobcards', { params }),
  create: (data) => api.post('/jobcards', data),
  getById: (id) => api.get(`/jobcards/${id}`),
  update: (id, data) => api.put(`/jobcards/${id}`, data),
  delete: (id) => api.delete(`/jobcards/${id}`),
  uploadPhotos: (id, files) => {
    const formData = new FormData();
    files.forEach(f => formData.append('photos', f));
    return api.post(`/jobcards/${id}/photos`, formData);
  },
  getPdfUrl: (id) => {
    const token = localStorage.getItem('ttn_token');
    return `/api/jobcards/${id}/pdf?token=${token}`;
  },
  printPdf: (id) => {
    return window.open(`/invoice/${id}`, '_blank');
  }
};
