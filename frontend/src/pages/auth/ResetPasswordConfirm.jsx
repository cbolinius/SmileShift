import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { authService } from '../../services/auth';
import { LoadingSpinner, Button } from '../../components/common';
import styles from './ResetPasswordConfirm.module.css';

function ResetPasswordConfirm() {
    const { token } = useParams();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const validatePassword = (pwd) => {
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,20}$/;
        return passwordRegex.test(pwd);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!validatePassword(password)) {
            setError('Password must be 8-20 characters with uppercase, lowercase, number, and special character');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);

        try {
            const data = await authService.completeReset(token, email, password);
            setSuccess(true);

            // Automatically redirect to login after 3 seconds
            setTimeout(() => {
                navigate('/login');
            }, 3000);
        } catch (err) {
            if (err.response?.status === 401) {
                setError('Invalid or expired reset token');
            } else if (err.response?.status === 410) {
                setError('Reset token has expired. Please request a new one.');
            } else if (err.response?.status === 404) {
                setError('Reset token not found. Please request a new one.');
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
                    <h2 className={styles.title}>Password Reset Successful!</h2>
                    <div className={styles.successMessage}>
                        <p>Your password has been reset successfully.</p>
                        <p>Redirecting you to login...</p>
                        <Link to="/login" className={styles.button}>
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
                <h2 className={styles.title}>Reset Your Password</h2>
                <p className={styles.description}>
                    Enter your email and new password to complete the reset.
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

                    <div className={styles.formGroup}>
                        <label className={styles.label}>New Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className={styles.input}
                            placeholder="8-20 chars with uppercase, lowercase, number, special"
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Confirm New Password</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            className={styles.input}
                            placeholder="Confirm your new password"
                        />
                    </div>

                    <Button type="submit" variant="primary" size="lg" fullWidth>
                        Reset Password
                    </Button>
                </form>

                <div className={styles.links}>
                    <Link to="/login" className={styles.link}>
                        Back to Login
                    </Link>
                    <span className={styles.separator}>|</span>
                    <Link to="/reset-password" className={styles.link}>
                        Request New Token
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default ResetPasswordConfirm;
