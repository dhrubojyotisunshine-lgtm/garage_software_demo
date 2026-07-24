import api from './axios';

export const settingsApi = {
  get: () => api.get('/settings'),
  updateProfile: (data) => api.put('/settings/profile', data),
  updatePassword: (data) => api.put('/settings/password', data),
  updateJobcard: (data) => api.put('/settings/jobcard', data),
  updateBilling: (data) => api.put('/settings/billing', data),
  updateInventory: (data) => api.put('/settings/inventory', data),
  updateUpi: (data) => api.put('/settings/upi', data),
  uploadImage: (type, file) => {
    const form = new FormData();
    form.append('image', file);
    return api.post(`/settings/upload/${type}`, form);
  },
  getStaffUsers: () => api.get('/settings/staff-users')
};
