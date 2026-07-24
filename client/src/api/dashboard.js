import api from './axios';

export const dashboardApi = {
  summary: () => api.get('/dashboard/summary'),
  revenueChart: (period, startDate, endDate) =>
    api.get('/dashboard/revenue-chart', { params: { period, startDate, endDate } }),
  vehicleMake: () => api.get('/dashboard/vehicle-make'),
  closedJobcards: () => api.get('/dashboard/closed-jobcards'),
  extendedSummary: () => api.get('/dashboard/extended-summary'),
  paymentBreakdown: () => api.get('/dashboard/payment-breakdown'),
  recentOpen: () => api.get('/dashboard/recent-open'),
};
