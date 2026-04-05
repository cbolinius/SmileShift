import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { BACKEND_URL } from '../config';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [joinedRooms, setJoinedRooms] = useState(new Set());
    const { user, isAuthenticated } = useAuth();

    const sendNegotiationMessage = useCallback((negotiationId, text) => {
        if (!socket || !isConnected) {
            console.error('Socket not connected');
            return false;
        }

        if (!joinedRooms.has(negotiationId)) {
            console.error(`Not joined to negotiation room: ${negotiationId}`);
            return false;
        }

        socket.emit('negotiation:message', { negotiation_id: negotiationId, text });
        return true;
    }, [socket, isConnected, joinedRooms]);

    const joinNegotiationRoom = useCallback((negotiationId) => {
        if (!socket || !isConnected) return;
        if (joinedRooms.has(negotiationId)) return;

        socket.emit('join-negotiation', { negotiationId });
        setJoinedRooms(prev => new Set([...prev, negotiationId]));
    }, [socket, isConnected, joinedRooms]);

    useEffect(() => {
        if (!isAuthenticated || !user) {
            if (socket) {
                socket.disconnect();
                setSocket(null);
                setIsConnected(false);
                setJoinedRooms(new Set());
            }
            return;
        }

        const token = localStorage.getItem('token');
        const newSocket = io(BACKEND_URL, {
            auth: { token },
            transports: ['websocket'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000
        });

        newSocket.on('connect', () => {
            console.log('Socket connected');
            setIsConnected(true);
        });

        newSocket.on('disconnect', () => {
            console.log('Socket disconnected');
            setIsConnected(false);
            setJoinedRooms(new Set());
        });

        newSocket.on('connect_error', (error) => {
            console.error('Socket connection error:', error);
            setIsConnected(false);
        });

        // Handle auto-join notifications from server
        newSocket.on('negotiation:ready', () => {
            console.log('Negotiation rooms ready');
        });

        setSocket(newSocket);

        return () => {
            newSocket.disconnect();
        };
    }, [isAuthenticated, user]);

    const value = {
        socket,
        isConnected,
        sendNegotiationMessage,
        joinNegotiationRoom,
        joinedRooms
    };

    return (
        <SocketContext.Provider value={value}>
            {children}
        </SocketContext.Provider>
    );
};

export const useSocket = () => {
    const context = useContext(SocketContext);
    if (!context) {
        throw new Error('useSocket must be used within SocketProvider');
    }
    return context;
};
