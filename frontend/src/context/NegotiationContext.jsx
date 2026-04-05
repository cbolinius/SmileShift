import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';
import { regularService } from '../services/regular';
import { businessService } from '../services/business';

const NegotiationContext = createContext();

export const NegotiationProvider = ({ children }) => {
    const { user, isAuthenticated, isRegular, isBusiness } = useAuth();
    const { socket } = useSocket();
    const [activeNegotiation, setActiveNegotiation] = useState(null);
    const [loading, setLoading] = useState(false);
    const [messages, setMessages] = useState([]);
    const [error, setError] = useState(null);

    // Fetch active negotiation on mount and when socket connects
    const fetchActiveNegotiation = useCallback(async (retryCount = 0) => {
        if (!isAuthenticated) return;

        try {
            const service = isRegular ? regularService : businessService;
            const negotiation = await service.getActiveNegotiation();

            console.log('Fetched negotiation:', JSON.stringify(negotiation, null, 2));

            setActiveNegotiation(negotiation);
            return negotiation;
        } catch (err) {
            // If negotiation expired (409), treat as failed
            if (err.response?.status === 409) {
                console.log('Negotiation expired (409), treating as failed');
                setActiveNegotiation(null);
            }
            // If negotiation not found (404) and we haven't retried too many times
            else if (err.response?.status === 404 && retryCount < 3) {
                console.log(`Negotiation not found, retrying (${retryCount + 1}/3)...`);
                await new Promise(resolve => setTimeout(resolve, 500));
                return fetchActiveNegotiation(retryCount + 1);
            }
            else if (err.response?.status !== 404) {
                console.error('Failed to fetch active negotiation:', err);
                console.error('Error response:', err.response?.data);
                setActiveNegotiation(null);
            }
            else {
                setActiveNegotiation(null);
            }
            return null;
        }
    }, [isAuthenticated, isRegular]);

    // Start a new negotiation
    const startNegotiation = async (interestId) => {
        setLoading(true);
        setError(null);
        try {
            const service = isRegular ? regularService : businessService;
            const negotiation = await service.startNegotiation(interestId);
            setActiveNegotiation(negotiation);
            return { success: true, negotiation };
        } catch (err) {
            const errorMsg = err.response?.data?.message || 'Failed to start negotiation';
            setError(errorMsg);
            return { success: false, error: errorMsg };
        } finally {
            setLoading(false);
        }
    };

    // Submit decision (accept/decline)
    const submitDecision = async (negotiationId, decision) => {
        // TESTING
        console.log('submitDecision called with:', { negotiationId, decision });

        setLoading(true);
        setError(null);
        try {
            const service = isRegular ? regularService : businessService;

            // TESTING
            console.log('Using service:', isRegular ? 'regularService' : 'businessService');

            const updated = await service.submitDecision(negotiationId, decision);

            // TESTING
            console.log('Decision response:', updated);

            // Update local state
            setActiveNegotiation(prev => ({
                ...prev,
                ...updated,
                decisions: updated.decisions
            }));

            return { success: true, negotiation: updated };
        } catch (err) {
            // TESTING
            console.error('Decision error:', err);
            console.error('Error response:', err.response?.data);

            const errorMsg = err.response?.data?.message || 'Failed to submit decision';
            setError(errorMsg);
            return { success: false, error: errorMsg };
        } finally {
            setLoading(false);
        }
    };

    const withdrawDecision = async (negotiationId) => {
        console.log('withdrawDecision called with:', { negotiationId });
        setLoading(true);
        setError(null);
        try {
            const service = isRegular ? regularService : businessService;
            const updated = await service.withdrawDecision(negotiationId);

            setActiveNegotiation(prev => ({
                ...prev,
                ...updated,
                decisions: updated.decisions
            }));

            return { success: true, negotiation: updated };
        } catch (err) {
            console.error('Withdraw error:', err);
            const errorMsg = err.response?.data?.message || 'Failed to withdraw decision';
            setError(errorMsg);
            return { success: false, error: errorMsg };
        } finally {
            setLoading(false);
        }
    };

    // Clear active negotiation (when ended/expired)
    const clearNegotiation = () => {
        setActiveNegotiation(null);
        setMessages([]);
    };

    // Socket event handlers
    useEffect(() => {
        if (!socket || !isAuthenticated) return;

        // Handle new negotiation started
        const handleNegotiationStarted = (data) => {
            console.log('Negotiation started:', data);
            fetchActiveNegotiation();
        };

        // Handle chat messages
        const handleNegotiationMessage = (message) => {
            console.log('New message:', message);
            setMessages(prev => [...prev, message]);
        };

        // Handle negotiation updates (status changes, decisions)
        const handleNegotiationUpdated = (data) => {
            console.log('Negotiation updated:', data);
            if (data.status === 'success' || data.status === 'failed') {
                // Negotiation ended
                setActiveNegotiation(prev => prev ? { ...prev, status: data.status } : null);
                setTimeout(() => clearNegotiation(), 3000);
            } else {
                fetchActiveNegotiation();
            }
        };

        // Handle decision notifications
        const handleNegotiationDecision = (data) => {
            console.log('Decision made:', data);
            fetchActiveNegotiation();
        };

        socket.on('negotiation:started', handleNegotiationStarted);
        socket.on('negotiation:message', handleNegotiationMessage);
        socket.on('negotiation-updated', handleNegotiationUpdated);
        socket.on('negotiationDecision', handleNegotiationDecision);

        return () => {
            socket.off('negotiation:started', handleNegotiationStarted);
            socket.off('negotiation:message', handleNegotiationMessage);
            socket.off('negotiation-updated', handleNegotiationUpdated);
            socket.off('negotiationDecision', handleNegotiationDecision);
        };
    }, [socket, isAuthenticated, fetchActiveNegotiation]);

    // Fetch active negotiation when authenticated
    useEffect(() => {
        if (isAuthenticated) {
            fetchActiveNegotiation();
        } else {
            clearNegotiation();
        }
    }, [isAuthenticated, fetchActiveNegotiation]);

    const value = {
        activeNegotiation,
        messages,
        loading,
        error,
        startNegotiation,
        submitDecision,
        withdrawDecision,
        clearNegotiation,
        fetchActiveNegotiation
    };

    return (
        <NegotiationContext.Provider value={value}>
            {children}
        </NegotiationContext.Provider>
    );
};

export const useNegotiation = () => {
    const context = useContext(NegotiationContext);
    if (!context) {
        throw new Error('useNegotiation must be used within NegotiationProvider');
    }
    return context;
};
