import api from './api';

export const regularService = {
    // --- Profile ---

    getProfile: async () => {
        const response = await api.get('/users/me');
        return response.data;
    },

    updateProfile: async (data) => {
        const response = await api.patch('/users/me', data);
        return response.data;
    },

    uploadAvatar: async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await api.put('/users/me/avatar', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },

    uploadResume: async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await api.put('/users/me/resume', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },

    setAvailability: async (available) => {
        const response = await api.patch('/users/me/available', { available });
        return response.data;
    },

    // --- Jobs ---

    getJobs: async (params = {}) => {
        const response = await api.get('/jobs', { params });
        return response.data;
    },

    getJobById: async (id, params = {}) => {
        const response = await api.get(`/jobs/${id}`, { params });
        return response.data;
    },

    setInterested: async (jobId, interested) => {
        const response = await api.patch(`/jobs/${jobId}/interested`, { interested });
        return response.data;
    },

    // --- Invitations & Interests ---

    getInvitations: async (params = {}) => {
        const response = await api.get('/users/me/invitations', { params });
        return response.data;
    },

    getInterests: async (params = {}) => {
        const response = await api.get('/users/me/interests', { params });
        return response.data;
    },

    getMyQualifications: async (params = {}) => {
        const response = await api.get('/users/me/qualifications', { params });
        return response.data;
    },

    getMyJobs: async (params = {}) => {
        const response = await api.get('/users/me/jobs', { params });
        return response.data;
    },

    getNegotiationForInterest: async (interestId) => {
        try {
            // Add a timeout to prevent hanging requests
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const response = await api.get(`/negotiations/interest/${interestId}`, {
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            return response.data;
        } catch (err) {
            if (err.code === 'ERR_CANCELED') {
                console.log(`Request timeout for interest ${interestId}`);
            } else if (err.response?.status === 404) {
                // No negotiation found - this is normal
                return null;
            } else if (err.response?.status === 403) {
                // Not authorized - also normal
                return null;
            }
            // Return null for any error to prevent breaking the UI
            return null;
        }
    },

    // --- Qualifications ---

    createQualification: async (positionTypeId, note = '') => {
        const response = await api.post('/qualifications', {
            position_type_id: positionTypeId,
            note
        });
        return response.data;
    },

    getQualificationById: async (id) => {
        const response = await api.get(`/qualifications/${id}`);
        return response.data;
    },

    updateQualification: async (id, data) => {
        const response = await api.patch(`/qualifications/${id}`, data);
        return response.data;
    },

    uploadQualificationDocument: async (id, file) => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await api.put(`/qualifications/${id}/document`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },

    // --- Negotiations ---

    startNegotiation: async (interestId) => {
        const response = await api.post('/negotiations', { interest_id: interestId });
        return response.data;
    },

    getActiveNegotiation: async () => {
        const response = await api.get('/negotiations/me');
        return response.data;
    },

    withdrawDecision: async (negotiationId) => {
        console.log('regularService.withdrawDecision:', { negotiationId });
        const response = await api.patch('/negotiations/me/withdraw', {
            negotiation_id: negotiationId
        });
        console.log('regularService.withdraw response:', response.data);
        return response.data;
    },

    getNegotiationById: async (id) => {
        const response = await api.get(`/negotiations/${id}`);
        return response.data;
    },

    submitDecision: async (negotiationId, decision) => {
        // TESTING
        console.log('regularService.submitDecision:', { negotiationId, decision });

        const response = await api.patch('/negotiations/me/decision', {
            negotiation_id: negotiationId,
            decision
        });

        // TESTING
        console.log('regularService response:', response.data);

        return response.data;
    }
};
