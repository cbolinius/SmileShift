import api from './api';

export const authService = {
    // Login
    login: async (email, password) => {
        const response = await api.post('/auth/tokens', { email, password });
        return response.data;
    },

    // Regular user registration
    registerRegular: async (userData) => {
        const response = await api.post('/users', userData);
        return response.data;
    },

    // Business registration
    registerBusiness: async (businessData) => {
        const response = await api.post('/businesses', businessData);
        return response.data;
    },

    // Request password reset
    requestReset: async (email) => {
        const response = await api.post('/auth/resets', { email });
        return response.data;
    },

    // Complete password reset
    completeReset: async (resetToken, email, password = null) => {
        const payload = { email };
        if (password) {
            payload.password = password;
        }
        const response = await api.post(`/auth/resets/${resetToken}`, payload);
        return response.data;
    },

    // Get current user (works for all roles)
    getCurrentUser: async () => {
        const response = await api.get('/me');
        return response.data;
    }
};
