import { useState, useEffect } from 'react';
import styles from './CountdownTimer.module.css';

function CountdownTimer({ expiresAt, onExpire }) {
    const [timeLeft, setTimeLeft] = useState(null);
    const [isExpired, setIsExpired] = useState(false);

    useEffect(() => {
        if (!expiresAt) return;

        const calculateTimeLeft = () => {
            const now = new Date().getTime();
            const expiry = new Date(expiresAt).getTime();
            const diff = expiry - now;

            if (diff <= 0) {
                setIsExpired(true);
                if (onExpire) onExpire();
                return null;
            }

            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            return { minutes, seconds, total: diff };
        };

        const update = () => {
            const newTimeLeft = calculateTimeLeft();
            setTimeLeft(newTimeLeft);
        };

        update();
        const interval = setInterval(update, 1000);

        return () => clearInterval(interval);
    }, [expiresAt, onExpire]);

    if (isExpired) {
        return (
            <div className={styles.expired}>
                <span className={styles.expiredIcon}>⏰</span>
                <span>Negotiation expired</span>
            </div>
        );
    }

    if (!timeLeft) {
        return <div className={styles.container}>Calculating...</div>;
    }

    const isUrgent = timeLeft.total < 60000; // Less than 1 minute

    return (
        <div className={`${styles.container} ${isUrgent ? styles.urgent : ''}`}>
            <svg className={styles.icon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
            </svg>
            <span className={styles.time}>
                {timeLeft.minutes}:{timeLeft.seconds.toString().padStart(2, '0')}
            </span>
        </div>
    );
}

export default CountdownTimer;
