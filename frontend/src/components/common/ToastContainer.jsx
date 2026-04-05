import { useState, useEffect } from 'react';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import Toast from './Toast';
import styles from './Toast.module.css';

function ToastContainer() {
    const { socket, isConnected } = useSocket();
    const { isAuthenticated } = useAuth();
    const [toasts, setToasts] = useState([]);

    useEffect(() => {
        if (!socket || !isConnected || !isAuthenticated) return;

        const handleNegotiationStarted = (data) => {
            console.log('Negotiation started notification:', data);

            if (data.initiated_by === 'you') {
                console.log('You initiated this negotiation, not showing notification');
                return;
            }

            const newToast = {
                id: Date.now(),
                negotiationId: data.negotiation_id,
                message: data.initiated_by === 'business'
                    ? 'A business has started a negotiation with you. Click to join the chat.'
                    : 'A candidate has started a negotiation with you. Click to join the chat.'
            };

            setToasts(prev => [...prev, newToast]);

            // Auto-remove after 8 seconds if not clicked
            setTimeout(() => {
                setToasts(prev => prev.filter(t => t.id !== newToast.id));
            }, 10000);
        };

        socket.on('negotiation:started', handleNegotiationStarted);

        return () => {
            socket.off('negotiation:started', handleNegotiationStarted);
        };
    }, [socket, isConnected, isAuthenticated]);

    const removeToast = (id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    if (toasts.length === 0) return null;

    return (
        <div className={styles.container}>
            {toasts.map(toast => (
                <Toast
                    key={toast.id}
                    message={toast.message}
                    negotiationId={toast.negotiationId}
                    onClose={() => removeToast(toast.id)}
                />
            ))}
        </div>
    );
}

export default ToastContainer;
