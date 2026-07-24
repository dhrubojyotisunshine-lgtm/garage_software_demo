import api from './axios';

function saHeaders() {
  const token = localStorage.getItem('ttn_sa_token');
  return { headers: { Authorization: `Bearer ${token}` } };
}

// Public — no super-admin token needed (used by the login page).
export const fetchPublicBranding = () => api.get('/superadmin/branding');

export const superAdminApi = {
  getProfile:     ()        => api.get('/superadmin/me', saHeaders()),
  updateProfile:  (data)    => api.put('/superadmin/profile', data, saHeaders()),
  changePassword: (data)    => api.put('/superadmin/profile/password', data, saHeaders()),
  uploadProfileLogo: (file) => {
    const form = new FormData();
    form.append('image', file);
    return api.post('/superadmin/profile/logo', form, { headers: { ...saHeaders().headers } });
  },
  dashboard:      (params)  => api.get('/superadmin/dashboard', { ...saHeaders(), params }),
  listGarages:    (params)  => api.get('/superadmin/garages', { ...saHeaders(), params }),
  createGarage:   (data)    => api.post('/superadmin/garages', data, saHeaders()),
  updateGarage:   (id, data)=> api.put(`/superadmin/garages/${id}`, data, saHeaders()),
  toggleGarage:   (id)      => api.patch(`/superadmin/garages/${id}/toggle`, {}, saHeaders()),
  loginAsGarage:  (id)      => api.post(`/superadmin/garages/${id}/login`, {}, saHeaders()),
  seedDefaults:   (id)      => api.post(`/superadmin/garages/${id}/seed-defaults`, {}, saHeaders()),
  garageStats:    (id)      => api.get(`/superadmin/garages/${id}/stats`, saHeaders()),
  updateBranding: (id, data)=> api.put(`/superadmin/garages/${id}/branding`, data, saHeaders()),
  updateMenu:     (id, data)=> api.put(`/superadmin/garages/${id}/menu`, data, saHeaders()),
  getCredentials:  (id)      => api.get(`/superadmin/garages/${id}/credentials`, saHeaders()),
  resetPassword:   (id, data)=> api.post(`/superadmin/garages/${id}/reset-password`, data, saHeaders()),
  uploadLogo:     (id, file) => {
    const form = new FormData();
    form.append('image', file);
    return api.post(`/superadmin/garages/${id}/logo`, form, {
      headers: { ...saHeaders().headers }
    });
  },
};
