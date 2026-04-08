import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../../services/auth';
import { LoadingSpinner, Button } from '../../components/common';
import styles from './ResetPassword.module.css';

function ResetPassword() {
    const navigate = useNavigate();
    const [step, setStep] = useState('request'); // 'request' or 'reset'
    const [email, setEmail] = useState('');
    const [resetToken, setResetToken] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [requestData, setRequestData] = useState(null);

    const validatePassword = (pwd) => {
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,20}$/;
        return passwordRegex.test(pwd);
    };

    const handleRequestReset = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const data = await authService.requestReset(email);
            setRequestData(data);
            setStep('reset');
        } catch (err) {
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

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setError('');

        if (!validatePassword(newPassword)) {
            setError('Password must be 8-20 characters with uppercase, lowercase, number, and special character');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);

        try {
            const result = await authService.completeReset(resetToken, email, newPassword);
            if (result.activated === true || result.id) {
                setSuccess(true);
                setTimeout(() => {
                    navigate('/login', { state: { message: 'Password reset successfully! You can now log in.' } });
                }, 3000);
            } else {
                setError('Password reset failed. Please try again.');
            }
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

    // Step 2: Enter token and new password
    if (step === 'reset') {
        return (
            <div className={styles.container}>
                <div className={styles.card}>
                    <h2 className={styles.title}>Reset Your Password</h2>
                    <p className={styles.description}>
                        Enter the reset token and your new password.
                    </p>
                    {requestData?.resetToken && (
                        <div className={styles.tokenInfo}>
                            <p><strong>For testing purposes, your reset token is:</strong></p>
                            <code className={styles.token}>{requestData.resetToken}</code>
                            <p className={styles.expires}>
                                This token expires on: {new Date(requestData.expiresAt).toLocaleString()}
                            </p>
                        </div>
                    )}

                    {error && (
                        <div className={styles.error}>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleResetPassword} className={styles.form}>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Reset Token</label>
                            <input
                                type="text"
                                value={resetToken}
                                onChange={(e) => setResetToken(e.target.value)}
                                required
                                className={styles.input}
                                placeholder="Enter your reset token"
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>New Password</label>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
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
                        <button
                            type="button"
                            onClick={() => setStep('request')}
                            className={styles.linkButton}
                        >
                            ← Back to request new token
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Step 1: Request reset token
    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <h2 className={styles.title}>Reset Password</h2>
                <p className={styles.description}>
                    Enter your email address to receive a reset token.
                </p>

                {error && (
                    <div className={styles.error}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleRequestReset} className={styles.form}>
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
                        Send Reset Token
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
