import api from './axios';

export const staffApi = {
  // Roles
  listRoles:    ()          => api.get('/staff/roles'),
  createRole:   (data)      => api.post('/staff/roles', data),
  updateRole:   (id, data)  => api.put(`/staff/roles/${id}`, data),
  // Role deletion is disabled — deleting a role that staff are assigned to breaks their access.
  // deleteRole:   (id)        => api.delete(`/staff/roles/${id}`),

  // Staff
  list:           ()          => api.get('/staff'),
  create:         (data)      => api.post('/staff', data),
  update:         (id, data)  => api.put(`/staff/${id}`, data),
  remove:         (id)        => api.delete(`/staff/${id}`),
  getCredentials: (id)        => api.get(`/staff/${id}/credentials`),
  resetPassword:  (id, pwd)   => api.post(`/staff/${id}/reset-password`, { password: pwd }),
};
