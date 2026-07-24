import api from './axios';

export const inventoryApi = {
  stats: () => api.get('/inventory/stats'),
  listSpares:  (params) => api.get('/masters/spares', { params }),
  createSpare: (data)   => api.post('/masters/spares', data),
  updateSpare: (id, data) => api.put(`/masters/spares/${id}`, data),
  deleteSpare: (id)     => api.delete(`/masters/spares/${id}`),

  listLubes:  (params) => api.get('/masters/lubes', { params }),
  createLube: (data)   => api.post('/masters/lubes', data),
  updateLube: (id, data) => api.put(`/masters/lubes/${id}`, data),
  deleteLube: (id)     => api.delete(`/masters/lubes/${id}`),

  listJobs:  (params) => api.get('/masters/labour', { params }),
  createJob: (data)   => api.post('/masters/labour', data),
  updateJob: (id, data) => api.put(`/masters/labour/${id}`, data),
  deleteJob: (id)     => api.delete(`/masters/labour/${id}`),

  listGroups:  (params) => api.get('/masters/packages', { params }),
  createGroup: (data)   => api.post('/masters/packages', data),
  updateGroup: (id, data) => api.put(`/masters/packages/${id}`, data),
  deleteGroup: (id)     => api.delete(`/masters/packages/${id}`),

  listVehicleMakes: () => api.get('/masters/vehicle-makes'),
  listVehicleModels: (makeId) => api.get('/masters/vehicle-models', { params: { makeId } }),

  importSpares: (file) => { const fd = new FormData(); fd.append('file', file); return api.post('/inventory/import/spares', fd); },
  importLubes:  (file) => { const fd = new FormData(); fd.append('file', file); return api.post('/inventory/import/lubes',  fd); },
  importJobs:   (file) => { const fd = new FormData(); fd.append('file', file); return api.post('/inventory/import/jobs',   fd); },
  history: (params) => api.get('/inventory/history', { params }),
};
