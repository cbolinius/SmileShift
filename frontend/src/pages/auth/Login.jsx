import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button, LoadingSpinner } from '../../components/common';
import styles from './Login.module.css';

function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const location = useLocation();
    const [activationMessage, setActivationMessage] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();
    const isSubmitting = useRef(false);
    const formRef = useRef(null);

    useEffect(() => {
        if (location.state?.message) {
            setActivationMessage(location.state.message);
            // Clear the message after 5 seconds
            const timer = setTimeout(() => setActivationMessage(''), 5000);
            return () => clearTimeout(timer);
        }
    }, [location]);

    useEffect(() => {
        const handleGlobalEnter = (e) => {
            if (e.key === 'Enter' && !loading && !isSubmitting.current) {
                e.preventDefault();
                e.stopPropagation();
                handleSubmit(e);
            }
        };

        window.addEventListener('keydown', handleGlobalEnter);
        return () => window.removeEventListener('keydown', handleGlobalEnter);
    }, [email, password, loading]);

    const handleSubmit = async (e) => {
        if (e && e.preventDefault) {
            e.preventDefault();
        }

        if (loading || isSubmitting.current) return;
        isSubmitting.current = true;

        setError('');
        setLoading(true);

        const result = await login(email, password);

        if (result.success) {
            if (result.user?.role === 'regular') {
                navigate('/regular/dashboard');
            } else if (result.user?.role === 'business') {
                navigate('/business/dashboard');
            } else if (result.user?.role === 'administrator') {
                navigate('/admin');
            }
        } else {
            setError(result.error || 'Login failed');
            setTimeout(() => setError(''), 5000);
        }

        setLoading(false);
        isSubmitting.current = false;
    };

    if (loading) return <LoadingSpinner />;

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <h2 className={styles.title}>Login</h2>

                {activationMessage && (
                    <div className={styles.successBanner}>
                        {activationMessage}
                    </div>
                )}

                {error && (
                    <div className={styles.error}>
                        {error}
                    </div>
                )}

                <form ref={formRef} className={styles.form} onSubmit={(e) => {
                    e.preventDefault();
                    return false;
                }}>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Email</label>
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
                        <label className={styles.label}>Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className={styles.input}
                            placeholder="••••••••"
                        />
                    </div>

                    <button type="submit" style={{ display: 'none' }} />

                    <Button onClick={handleSubmit} variant="primary" size="lg" fullWidth type="button">
                        Login
                    </Button>
                </form>

                <div className={styles.links}>
                    <Link to="/reset-password" className={styles.link}>
                        Forgot password?
                    </Link>
                    <span className={styles.separator}>|</span>
                    <Link to="/register/regular" className={styles.link}>
                        Create account
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default Login;
