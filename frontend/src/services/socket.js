import { io } from 'socket.io-client';

let socket = null;

export const initializeSocket = (token) => {
    if (socket) {
        socket.disconnect();
    }

    socket = io('http://localhost:3000', {
        auth: { token },
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
    });

    socket.on('connect', () => {
        console.log('Socket connected');
    });

    socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
    });

    socket.on('disconnect', () => {
        console.log('Socket disconnected');
    });

    socket.on('negotiation:started', (data) => {
        // Handle new negotiation notification
    });

    return socket;
};

export const getSocket = () => {
    if (!socket) {
        throw new Error('Socket not initialized');
    }
    return socket;
};

export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};
