import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../../services/auth';
import { LoadingSpinner, Button } from '../../components/common';
import styles from './ResetPassword.module.css';

function ResetPassword() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [resetToken, setResetToken] = useState(null);
    const [expiresAt, setExpiresAt] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const data = await authService.requestReset(email);
            setSuccess(true);
            setResetToken(data.resetToken);
            setExpiresAt(data.expiresAt);
        } catch (err) {
            // Even if email doesn't exist, API returns 202 with token - backup catch
            if (err.response?.status === 429) {
                setError('Too many requests. Please wait before trying again.');
            } else if (err.response?.status === 400) {
                setError('Invalid email format.');
            } else {
                setError('Something went wrong. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <LoadingSpinner />;

    if (success) {
        return (
            <div className={styles.container}>
                <div className={styles.card}>
                    <h2 className={styles.title}>Password Reset Requested</h2>
                    <div className={styles.successMessage}>
                        <p>If an account exists with this email, you will receive a reset token.</p>
                        {resetToken && (
                            <div className={styles.tokenInfo}>
                                <p><strong>For testing purposes, here's your reset token:</strong></p>
                                <code className={styles.token}>{resetToken}</code>
                                <p className={styles.expires}>
                                    This token expires on: {new Date(expiresAt).toLocaleString()}
                                </p>
                            </div>
                        )}
                        <p className={styles.instruction}>
                            Use this token to reset your password. In a production environment,
                            this would be sent via email.
                        </p>
                        <Link to="/login" className={styles.button}>
                            <Button variant="primary">
                                Return to Login
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <h2 className={styles.title}>Reset Password</h2>
                <p className={styles.description}>
                    Enter your email address and we'll send you a link to reset your password.
                </p>

                {error && (
                    <div className={styles.error}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Email Address</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className={styles.input}
                            placeholder="your@email.com"
                        />
                    </div>

                    <Button type="submit" variant="primary" size="lg" fullWidth>
                        Send Reset Link
                    </Button>
                </form>

                <div className={styles.links}>
                    <Link to="/login" className={styles.link}>
                        Back to Login
                    </Link>
                    <span className={styles.separator}>|</span>
                    <Link to="/register/regular" className={styles.link}>
                        Create Account
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default ResetPassword;
