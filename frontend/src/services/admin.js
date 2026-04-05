import api from './api';

export const adminService = {
  // Users
  getUsers: (params) => api.get('/users', { params }).then(r => r.data),
  suspendUser: (userId, suspended) =>
    api.patch(`/users/${userId}/suspended`, { suspended }).then(r => r.data),

  // Businesses
  getBusinesses: (params) => api.get('/businesses', { params }).then(r => r.data),
  verifyBusiness: (businessId, verified) =>
    api.patch(`/businesses/${businessId}/verified`, { verified }).then(r => r.data),

  // Position Types
  getPositionTypes: (params) => api.get('/position-types', { params }).then(r => r.data),
  createPositionType: (data) => api.post('/position-types', data).then(r => r.data),
  updatePositionType: (id, data) => api.patch(`/position-types/${id}`, data).then(r => r.data),
  deletePositionType: (id) => api.delete(`/position-types/${id}`).then(r => r.data),

  // Qualifications
  getQualifications: (params) => api.get('/qualifications', { params }).then(r => r.data),
  getQualification: (id) => api.get(`/qualifications/${id}`).then(r => r.data),
  reviewQualification: (id, status, note) =>
    api.patch(`/qualifications/${id}`, { status, note }).then(r => r.data),

  // System Config
  setResetCooldown: (v) => api.patch('/system/reset-cooldown', { reset_cooldown: v }).then(r => r.data),
  setNegotiationWindow: (v) => api.patch('/system/negotiation-window', { negotiation_window: v }).then(r => r.data),
  setJobStartWindow: (v) => api.patch('/system/job-start-window', { job_start_window: v }).then(r => r.data),
  setAvailabilityTimeout: (v) => api.patch('/system/availability-timeout', { availability_timeout: v }).then(r => r.data),
  getSystemConfig: () => api.get('/system').then(r => r.data),
};
