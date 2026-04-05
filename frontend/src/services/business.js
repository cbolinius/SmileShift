import api from './api';

export const businessService = {
  // Profile
  getProfile: () => api.get('/businesses/me').then(r => r.data),
  updateProfile: (data) => api.patch('/businesses/me', data).then(r => r.data),
  uploadAvatar: (file) => {
    const form = new FormData();
    form.append('file', file);
    return api.put('/businesses/me/avatar', form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(r => r.data);
  },

  // Jobs
  getJobs: (params) => api.get('/businesses/me/jobs', { params }).then(r => r.data),
  createJob: (data) => api.post('/businesses/me/jobs', data).then(r => r.data),
  updateJob: (jobId, data) => api.patch(`/businesses/me/jobs/${jobId}`, data).then(r => r.data),
  deleteJob: (jobId) => api.delete(`/businesses/me/jobs/${jobId}`).then(r => r.data),

  // Candidates
  getCandidates: (jobId, params) => api.get(`/jobs/${jobId}/candidates`, { params }).then(r => r.data),
  getCandidateDetail: (jobId, userId) => api.get(`/jobs/${jobId}/candidates/${userId}`).then(r => r.data),
  inviteCandidate: (jobId, userId, interested) =>
    api.patch(`/jobs/${jobId}/candidates/${userId}/interested`, { interested }).then(r => r.data),

  // Interests (candidates who expressed interest)
  getJobInterests: (jobId, params) => api.get(`/jobs/${jobId}/interests`, { params }).then(r => r.data),

  // No-show
  reportNoShow: (jobId) => api.patch(`/jobs/${jobId}/no-show`).then(r => r.data),

  // Position types (for create job dropdown)
  getPositionTypes: (params) => api.get('/position-types', { params }).then(r => r.data),

  // Single job (for job detail)
  getJob: (jobId) => api.get(`/jobs/${jobId}`).then(r => r.data),

  // Negotiations
  startNegotiation: async (interestId) => {
      const response = await api.post('/negotiations', { interest_id: interestId });
      return response.data;
  },

  getActiveNegotiation: async () => {
      const response = await api.get('/negotiations/me');
      return response.data;
  },

  withdrawDecision: async (negotiationId) => {
      console.log('businessService.withdrawDecision:', { negotiationId });
      const response = await api.patch('/negotiations/me/withdraw', {
          negotiation_id: negotiationId
      });
      console.log('businessService.withdraw response:', response.data);
      return response.data;
  },

  getNegotiationById: async (id) => {
      const response = await api.get(`/negotiations/${id}`);
      return response.data;
  },
  getNegotiationForInterest: async (interestId) => {
    const response = await api.get(`/negotiations/interest/${interestId}`);
    return response.data;
  },

  submitDecision: async (negotiationId, decision) => {
      // TESTING
      console.log('businessService.submitDecision:', { negotiationId, decision });

      const response = await api.patch('/negotiations/me/decision', {
          negotiation_id: negotiationId,
          decision
      });

      // TESTING
      console.log('businessService response:', response.data);

      return response.data;
  }
};
