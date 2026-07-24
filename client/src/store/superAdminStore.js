import { create } from 'zustand';
import api from '../api/axios';

const useSuperAdminStore = create((set) => ({
  admin:   null,
  token:   localStorage.getItem('ttn_sa_token') || null,
  loading: false,

  login: async (email, password) => {
    set({ loading: true });
    try {
      const { data } = await api.post('/superadmin/login', { email, password });
      localStorage.setItem('ttn_sa_token', data.token);
      set({ admin: data.admin, token: data.token, loading: false });
      return { ok: true };
    } catch (err) {
      set({ loading: false });
      return { ok: false, message: err?.response?.data?.message || 'Login failed' };
    }
  },

  fetchMe: async () => {
    const token = localStorage.getItem('ttn_sa_token');
    if (!token) return;
    try {
      const { data } = await api.get('/superadmin/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      set({ admin: data, token });
    } catch {
      localStorage.removeItem('ttn_sa_token');
      set({ admin: null, token: null });
    }
  },

  setAdmin: (admin) => set({ admin }),

  logout: () => {
    localStorage.removeItem('ttn_sa_token');
    set({ admin: null, token: null });
  }
}));

export default useSuperAdminStore;
