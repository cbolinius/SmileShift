import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/auth';
import { LoadingSpinner, Button } from '../../components/common';
import styles from './RegisterBusiness.module.css';

function RegisterBusiness() {
    const navigate = useNavigate();
    const { registerBusiness } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [activating, setActivating] = useState(false);
    const [registrationData, setRegistrationData] = useState(null);

    const [formData, setFormData] = useState({
        business_name: '',
        owner_name: '',
        email: '',
        password: '',
        confirm_password: '',
        phone_number: '',
        postal_address: '',
        location: {
            lon: '',
            lat: ''
        }
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === 'lon' || name === 'lat') {
            setFormData({
                ...formData,
                location: {
                    ...formData.location,
                    [name]: parseFloat(value) || ''
                }
            });
        } else {
            setFormData({
                ...formData,
                [name]: value
            });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Validate password match
        if (formData.password !== formData.confirm_password) {
            setError('Passwords do not match');
            return;
        }

        // Validate password strength
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,20}$/;
        if (!passwordRegex.test(formData.password)) {
            setError('Password must be 8-20 characters with uppercase, lowercase, number, and special character');
            return;
        }

        // Validate location
        if (!formData.location.lon || !formData.location.lat) {
            setError('Location coordinates are required');
            return;
        }

        setLoading(true);

        const { confirm_password, ...submitData } = formData;
        const result = await registerBusiness(submitData);

        if (result.success) {
            setSuccess(true);
            setRegistrationData(result.data);
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
            const result = await authService.completeReset(
                registrationData.resetToken,
                registrationData.email
            );

            if (result.activated === true) {
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
                        Your business account has been created. Click the button below to activate your account.
                        You will also need to be verified by an administrator before you can post jobs.
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
                <h2 className={styles.title}>Register Your Business</h2>

                {error && (
                    <div className={styles.error}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Business Name *</label>
                        <input
                            type="text"
                            name="business_name"
                            value={formData.business_name}
                            onChange={handleChange}
                            required
                            className={styles.input}
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Owner Name *</label>
                        <input
                            type="text"
                            name="owner_name"
                            value={formData.owner_name}
                            onChange={handleChange}
                            required
                            className={styles.input}
                        />
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
                        <label className={styles.label}>Phone Number *</label>
                        <input
                            type="tel"
                            name="phone_number"
                            value={formData.phone_number}
                            onChange={handleChange}
                            required
                            className={styles.input}
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Postal Address *</label>
                        <input
                            type="text"
                            name="postal_address"
                            value={formData.postal_address}
                            onChange={handleChange}
                            required
                            className={styles.input}
                        />
                    </div>

                    <div className={styles.row}>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Longitude *</label>
                            <input
                                type="number"
                                name="lon"
                                value={formData.location.lon}
                                onChange={handleChange}
                                required
                                step="any"
                                className={styles.input}
                                placeholder="-79.3998729"
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Latitude *</label>
                            <input
                                type="number"
                                name="lat"
                                value={formData.location.lat}
                                onChange={handleChange}
                                required
                                step="any"
                                className={styles.input}
                                placeholder="43.6598084"
                            />
                        </div>
                    </div>

                    <Button type="submit" variant="primary" size="lg" fullWidth>
                        Register Business
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

export default RegisterBusiness;
