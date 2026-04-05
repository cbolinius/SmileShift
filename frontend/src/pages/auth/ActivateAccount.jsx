import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { authService } from '../../services/auth';
import { Button, LoadingSpinner } from '../../components/common';
import styles from './ActivateAccount.module.css';

function ActivateAccount() {
    const { token } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [email, setEmail] = useState('');

    useEffect(() => {
        const activateAccount = async () => {
            if (!token) {
                setError('Invalid activation link');
                setLoading(false);
                return;
            }

            // Prompt for email if not provided (since activation requires email)
            // For simplicity, we'll show an email input form
            setLoading(false);
        };

        activateAccount();
    }, [token]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email.trim()) {
            setError('Email is required');
            return;
        }

        setLoading(true);
        setError('');

        try {
            // Activate by completing password reset with no new password
            // This sets activated = true
            const result = await authService.completeReset(token, email);
            if (result.activated === true) {
                setSuccess(true);
                // Redirect to login after 3 seconds
                setTimeout(() => {
                    navigate('/login');
                }, 3000);
            } else {
                setError('Activation failed. Please check your token and email.');
            }
        } catch (err) {
            if (err.response?.status === 401) {
                setError('Invalid or expired activation token');
            } else if (err.response?.status === 410) {
                setError('Activation token has expired. Please request a new one.');
            } else if (err.response?.status === 404) {
                setError('Activation token not found');
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
                    <h2 className={styles.title}>Account Activated!</h2>
                    <div className={styles.successMessage}>
                        <p>Your account has been successfully activated.</p>
                        <p>Redirecting you to login...</p>
                        <Link to="/login">
                            <Button variant="primary">
                                Go to Login Now
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
                <h2 className={styles.title}>Activate Your Account</h2>
                <p className={styles.description}>
                    Enter your email address to complete activation.
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
                        Activate Account
                    </Button>
                </form>

                <div className={styles.links}>
                    <Link to="/login" className={styles.link}>
                        Back to Login
                    </Link>
                    <span className={styles.separator}>|</span>
                    <Link to="/register/regular" className={styles.link}>
                        Create New Account
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default ActivateAccount;