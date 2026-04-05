import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Toast.module.css';

function Toast({ message, negotiationId, onClose, duration = 5000 }) {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(false);
            setTimeout(onClose, 300);
        }, duration);
        return () => clearTimeout(timer);
    }, [duration, onClose]);

    if (!isVisible) return null;

    return (
        <div className={styles.toast}>
            <div className={styles.content}>
                <div className={styles.text}>
                    <strong>New Negotiation Started!</strong>
                    <p>{message}</p>
                </div>
            </div>
            <div className={styles.actions}>
                <button
                    className={styles.viewButton}
                    onClick={() => {
                        window.location.href = '/negotiation';
                        onClose();
                    }}
                >
                    View
                </button>
                <button className={styles.closeButton} onClick={onClose}>✕</button>
            </div>
        </div>
    );
}

export default Toast;
