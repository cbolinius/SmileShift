import api from './api';

export const publicService = {
    // Get list of businesses (public)
    getBusinesses: async (params = {}) => {
        const response = await api.get('/businesses', { params });
        return response.data;
    },

    // Get single business details (public)
    getBusinessById: async (id) => {
        const response = await api.get(`/businesses/${id}`);
        return response.data;
    },

    // Get position types
    getPositionTypes: async (params = {}) => {
        const response = await api.get('/position-types', { params });
        return response.data;
    }
};
