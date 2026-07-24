import { create } from 'zustand';

let toastId = 0;

const useToastStore = create((set, get) => ({
  toasts: [],

  toast: ({ title, description, variant = 'default', duration = 4000 }) => {
    const id = ++toastId;
    set(s => ({ toasts: [...s.toasts, { id, title, description, variant }] }));
    setTimeout(() => {
      set(s => ({ toasts: s.toasts.filter(t => t.id !== id) }));
    }, duration);
  },

  dismiss: (id) => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) }))
}));

export default useToastStore;
