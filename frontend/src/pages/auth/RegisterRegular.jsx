import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/auth';
import { Button, LoadingSpinner } from '../../components/common';
import styles from './RegisterRegular.module.css';

function RegisterRegular() {
    const navigate = useNavigate();
    const { registerRegular } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [activating, setActivating] = useState(false);
    const [registrationData, setRegistrationData] = useState(null);

    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        password: '',
        confirm_password: '',
        phone_number: '',
        postal_address: '',
        birthday: ''
    });

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Validate password match
        if (formData.password !== formData.confirm_password) {
            setError('Passwords do not match');
            return;
        }

        // Validate password strength WILL NEED TO TEMP DISABLE LATER FOR BASE USERS/ADMINS
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,20}$/;
        if (!passwordRegex.test(formData.password)) {
            setError('Password must be 8-20 characters with uppercase, lowercase, number, and special character');
            return;
        }

        setLoading(true);

        const { confirm_password, ...submitData } = formData;
        const result = await registerRegular(submitData);

        if (result.success) {
            setSuccess(true);
            setRegistrationData(result.data);
            // Clear form
            setFormData({
                first_name: '',
                last_name: '',
                email: '',
                password: '',
                confirm_password: '',
                phone_number: '',
                postal_address: '',
                birthday: ''
            });
        } else {
            setError(result.error || 'Registration failed');
        }

        setLoading(false);
    };

    const handleActivate = async () => {
        if (!registrationData?.resetToken || !registrationData?.email) {
            setError('Missing activation information');
            return;
        }

        setActivating(true);
        setError('');

        try {
            // Activate account by completing reset with no password change
            const result = await authService.completeReset(
                registrationData.resetToken,
                registrationData.email
            );

            if (result.activated === true) {
                // Redirect to login page
                navigate('/login', {
                    state: { message: 'Account activated successfully! You can now log in.' }
                });
            } else {
                setError('Activation failed. Please try again.');
            }
        } catch (err) {
            if (err.response?.status === 401) {
                setError('Invalid or expired activation token');
            } else if (err.response?.status === 410) {
                setError('Activation token has expired. Please contact support.');
            } else {
                setError('Something went wrong. Please try again.');
            }
        } finally {
            setActivating(false);
        }
    };

    if (loading) return <LoadingSpinner />;

    if (success && registrationData) {
        return (
            <div className={styles.container}>
                <div className={styles.card}>
                    <h2 className={styles.title}>Registration Successful!</h2>
                    <p className={styles.successMessage}>
                        Your account has been created. Click the button below to activate your account.
                    </p>
                    <Button
                        variant="primary"
                        size="lg"
                        fullWidth
                        onClick={handleActivate}
                        disabled={activating}
                    >
                        {activating ? 'Activating...' : 'Activate Account'}
                    </Button>
                    <p className={styles.instruction}>
                        After activation, you'll be redirected to the login page.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <h2 className={styles.title}>Create Regular User Account</h2>

                {error && (
                    <div className={styles.error}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.row}>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>First Name *</label>
                            <input
                                type="text"
                                name="first_name"
                                value={formData.first_name}
                                onChange={handleChange}
                                required
                                className={styles.input}
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Last Name *</label>
                            <input
                                type="text"
                                name="last_name"
                                value={formData.last_name}
                                onChange={handleChange}
                                required
                                className={styles.input}
                            />
                        </div>
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Email *</label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                            className={styles.input}
                            placeholder="your@email.com"
                        />
                    </div>

                    <div className={styles.row}>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Password *</label>
                            <input
                                type="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                required
                                className={styles.input}
                                placeholder="8-20 chars with uppercase, lowercase, number, special"
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Confirm Password *</label>
                            <input
                                type="password"
                                name="confirm_password"
                                value={formData.confirm_password}
                                onChange={handleChange}
                                required
                                className={styles.input}
                            />
                        </div>
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Phone Number</label>
                        <input
                            type="tel"
                            name="phone_number"
                            value={formData.phone_number}
                            onChange={handleChange}
                            className={styles.input}
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Postal Address</label>
                        <input
                            type="text"
                            name="postal_address"
                            value={formData.postal_address}
                            onChange={handleChange}
                            className={styles.input}
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Birthday</label>
                        <input
                            type="date"
                            name="birthday"
                            value={formData.birthday}
                            onChange={handleChange}
                            className={styles.input}
                        />
                    </div>

                    <Button type="submit" variant="primary" size="lg" fullWidth>
                        Register
                    </Button>
                </form>

                <div className={styles.links}>
                    Already have an account?{' '}
                    <Link to="/login" className={styles.link}>
                        Login here
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default RegisterRegular;
