import { create } from 'zustand';
import { authApi } from '../api/auth';

const useAuthStore = create((set, get) => ({
  garage:          null,
  token:           localStorage.getItem('ttn_token'),
  isLoading:       false,
  isAuthenticated: !!localStorage.getItem('ttn_token'),
  isStaff:         false,
  staffUser:       null,

  login: async (credentials) => {
    set({ isLoading: true });
    try {
      const { data } = await authApi.login(credentials);
      localStorage.setItem('ttn_token', data.token);
      set({ token: data.token, garage: data.garage, isAuthenticated: true, isLoading: false, isStaff: false, staffUser: null });
      return { success: true };
    } catch (error) {
      set({ isLoading: false });
      return { success: false, message: error.response?.data?.message || 'Login failed' };
    }
  },

  staffLogin: async (credentials) => {
    set({ isLoading: true });
    try {
      const { data } = await authApi.staffLogin(credentials);
      localStorage.setItem('ttn_token', data.token);
      set({ token: data.token, garage: data.garage, isAuthenticated: true, isLoading: false, isStaff: true, staffUser: data.staff });
      return { success: true };
    } catch (error) {
      set({ isLoading: false });
      return { success: false, message: error.response?.data?.message || 'Login failed' };
    }
  },

  register: async (formData) => {
    set({ isLoading: true });
    try {
      const { data } = await authApi.register(formData);
      set({ isLoading: false });
      return { success: true, message: data.message, phone: data.phone };
    } catch (error) {
      set({ isLoading: false });
      return { success: false, message: error.response?.data?.message || 'Registration failed' };
    }
  },

  verifyOtp: async (payload) => {
    set({ isLoading: true });
    try {
      const { data } = await authApi.verifyOtp(payload);
      localStorage.setItem('ttn_token', data.token);
      set({ token: data.token, garage: data.garage, isAuthenticated: true, isLoading: false, isStaff: false, staffUser: null });
      return { success: true };
    } catch (error) {
      set({ isLoading: false });
      return { success: false, message: error.response?.data?.message || 'OTP verification failed' };
    }
  },

  fetchMe: async () => {
    if (!localStorage.getItem('ttn_token')) return;
    try {
      const { data } = await authApi.getMe();
      set({
        garage:          data.garage,
        isAuthenticated: true,
        isStaff:         !!data.staff,
        staffUser:       data.staff || null,
      });
    } catch {
      get().logout();
    }
  },

  updateGarage: (garageData) => {
    set(state => ({ garage: { ...state.garage, ...garageData } }));
  },

  logout: () => {
    localStorage.removeItem('ttn_token');
    localStorage.removeItem('ttn_impersonating');
    set({ token: null, garage: null, isAuthenticated: false, isStaff: false, staffUser: null });
  }
}));

export default useAuthStore;
