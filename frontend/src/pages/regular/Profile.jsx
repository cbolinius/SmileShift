import { useState, useEffect, useRef } from 'react';
import { regularService } from '../../services/regular';
import { Button, LoadingSpinner } from '../../components/common';
import styles from './Profile.module.css';
import { BACKEND_URL } from '../../config';

function Profile() {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState('');
    const [saveSuccess, setSaveSuccess] = useState('');
    const [uploadError, setUploadError] = useState('');
    const [uploadSuccess, setUploadSuccess] = useState('');
    const [availLoading, setAvailLoading] = useState(false);
    const [availError, setAvailError] = useState('');

    const avatarInputRef = useRef(null);
    const resumeInputRef = useRef(null);

    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        phone_number: '',
        postal_address: '',
        birthday: '',
        biography: ''
    });

    const fetchProfile = async () => {
        setLoading(true);
        setError('');
        try {
            const data = await regularService.getProfile();
            setProfile(data);
            setFormData({
                first_name: data.first_name || '',
                last_name: data.last_name || '',
                phone_number: data.phone_number || '',
                postal_address: data.postal_address || '',
                birthday: data.birthday || '',
                biography: data.biography || ''
            });
        } catch (err) {
            setError('Failed to load profile');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProfile();
    }, []);

    // Auto-dismiss messages after 5s
    useEffect(() => {
        if (!saveSuccess) return;
        const t = setTimeout(() => setSaveSuccess(''), 5000);
        return () => clearTimeout(t);
    }, [saveSuccess]);

    useEffect(() => {
        if (!saveError) return;
        const t = setTimeout(() => setSaveError(''), 5000);
        return () => clearTimeout(t);
    }, [saveError]);

    useEffect(() => {
        if (!uploadSuccess) return;
        const t = setTimeout(() => setUploadSuccess(''), 5000);
        return () => clearTimeout(t);
    }, [uploadSuccess]);

    useEffect(() => {
        if (!uploadError) return;
        const t = setTimeout(() => setUploadError(''), 5000);
        return () => clearTimeout(t);
    }, [uploadError]);

    useEffect(() => {
        if (!availError) return;
        const t = setTimeout(() => setAvailError(''), 5000);
        return () => clearTimeout(t);
    }, [availError]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        setSaveError('');
        setSaveSuccess('');
        try {
            await regularService.updateProfile(formData);
            setSaveSuccess('Profile updated successfully');
            setEditing(false);
            await fetchProfile();
        } catch (err) {
            setSaveError(err.response?.data?.error || 'Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    const handleAvatarUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploadError('');
        setUploadSuccess('');
        try {
            await regularService.uploadAvatar(file);
            setUploadSuccess('Avatar updated successfully');
            await fetchProfile();
        } catch (err) {
            setUploadError(err.response?.data?.error || 'Failed to upload avatar');
        }
        e.target.value = '';
    };

    const handleResumeUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploadError('');
        setUploadSuccess('');
        try {
            await regularService.uploadResume(file);
            setUploadSuccess('Resume updated successfully');
            await fetchProfile();
        } catch (err) {
            setUploadError(err.response?.data?.error || 'Failed to upload resume');
        }
        e.target.value = '';
    };

    const handleAvailabilityToggle = async () => {
        setAvailLoading(true);
        setAvailError('');
        try {
            await regularService.setAvailability(!profile.available);
            await fetchProfile();
        } catch (err) {
            setAvailError(err.response?.data?.error || 'Failed to update availability');
        } finally {
            setAvailLoading(false);
        }
    };

    if (loading) return <LoadingSpinner />;

    if (error) {
        return (
            <div className={styles.errorContainer}>
                <p className={styles.error}>{error}</p>
                <Button variant="primary" onClick={fetchProfile}>Retry</Button>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <h1 className={styles.pageTitle}>My Profile</h1>

            {(saveSuccess || uploadSuccess) && (
                <div className={styles.successBanner}>{saveSuccess || uploadSuccess}</div>
            )}
            {(saveError || uploadError) && (
                <div className={styles.errorBanner}>{saveError || uploadError}</div>
            )}

            <div className={styles.layout}>
                {/* Sidebar */}
                <div className={styles.sidebar}>
                    <div className={styles.card}>
                        <div className={styles.avatarSection}>
                            {profile.avatar ? (
                                <img
                                    src={`${BACKEND_URL}${profile.avatar}`}
                                    alt="Avatar"
                                    className={styles.avatar}
                                />
                            ) : (
                                <div className={styles.avatarPlaceholder}>
                                    {profile.first_name?.[0]}{profile.last_name?.[0]}
                                </div>
                            )}
                            <input
                                type="file"
                                accept="image/png,image/jpeg"
                                ref={avatarInputRef}
                                onChange={handleAvatarUpload}
                                className={styles.hiddenInput}
                            />
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => avatarInputRef.current.click()}
                            >
                                {profile.avatar ? 'Change Avatar' : 'Upload Avatar'}
                            </Button>
                        </div>

                        <div className={styles.nameSection}>
                            <h2 className={styles.name}>
                                {profile.first_name} {profile.last_name}
                            </h2>
                            <p className={styles.email}>{profile.email}</p>
                        </div>

                        <div className={styles.availabilitySection}>
                            <div className={styles.availabilityHeader}>
                                <span className={styles.availabilityLabel}>Availability</span>
                                <span className={`${styles.badge} ${profile.available ? styles.badgeSuccess : styles.badgeDanger}`}>
                                    {profile.available ? 'Available' : 'Unavailable'}
                                </span>
                            </div>
                            <Button
                                variant={profile.available ? 'danger' : 'success'}
                                size="sm"
                                fullWidth
                                onClick={handleAvailabilityToggle}
                                disabled={availLoading}
                            >
                                {availLoading ? 'Updating...' : profile.available ? 'Set Unavailable' : 'Set Available'}
                            </Button>
                            {availError && <p className={styles.inlineError}>{availError}</p>}
                        </div>
                    </div>

                    <div className={styles.card}>
                        <h3 className={styles.cardTitle}>Resume</h3>
                        {profile.resume ? (
                            <a
                                href={`${BACKEND_URL}${profile.resume}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.resumeLink}
                            >
                                View Resume (PDF)
                            </a>
                        ) : (
                            <p className={styles.mutedText}>No resume uploaded yet</p>
                        )}
                        <input
                            type="file"
                            accept="application/pdf"
                            ref={resumeInputRef}
                            onChange={handleResumeUpload}
                            className={styles.hiddenInput}
                        />
                        <Button
                            variant="secondary"
                            size="sm"
                            fullWidth
                            onClick={() => resumeInputRef.current.click()}
                        >
                            {profile.resume ? 'Replace Resume' : 'Upload Resume'}
                        </Button>
                    </div>
                </div>

                {/* Main content */}
                <div className={styles.main}>
                    <div className={styles.card}>
                        <div className={styles.cardHeader}>
                            <h3 className={styles.cardTitle}>Personal Information</h3>
                            {!editing && (
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => { setEditing(true); setSaveSuccess(''); }}
                                >
                                    Edit
                                </Button>
                            )}
                        </div>

                        {editing ? (
                            <form onSubmit={handleSave} className={styles.form}>
                                <div className={styles.row}>
                                    <div className={styles.formGroup}>
                                        <label className={styles.label}>First Name</label>
                                        <input
                                            type="text"
                                            name="first_name"
                                            value={formData.first_name}
                                            onChange={handleChange}
                                            className={styles.input}
                                            required
                                        />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label className={styles.label}>Last Name</label>
                                        <input
                                            type="text"
                                            name="last_name"
                                            value={formData.last_name}
                                            onChange={handleChange}
                                            className={styles.input}
                                            required
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

                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Biography</label>
                                    <textarea
                                        name="biography"
                                        value={formData.biography}
                                        onChange={handleChange}
                                        className={styles.textarea}
                                        rows={4}
                                        placeholder="Tell us about yourself..."
                                    />
                                </div>

                                <div className={styles.formActions}>
                                    <Button type="submit" variant="primary" size="md" disabled={saving}>
                                        {saving ? 'Saving...' : 'Save Changes'}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        size="md"
                                        onClick={() => { setEditing(false); setSaveError(''); }}
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            </form>
                        ) : (
                            <div className={styles.infoGrid}>
                                <div className={styles.infoItem}>
                                    <span className={styles.infoLabel}>Phone</span>
                                    <span className={styles.infoValue}>{profile.phone_number || '—'}</span>
                                </div>
                                <div className={styles.infoItem}>
                                    <span className={styles.infoLabel}>Address</span>
                                    <span className={styles.infoValue}>{profile.postal_address || '—'}</span>
                                </div>
                                <div className={styles.infoItem}>
                                    <span className={styles.infoLabel}>Birthday</span>
                                    <span className={styles.infoValue}>{profile.birthday || '—'}</span>
                                </div>
                                <div className={styles.infoItem}>
                                    <span className={styles.infoLabel}>Member Since</span>
                                    <span className={styles.infoValue}>
                                        {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : '—'}
                                    </span>
                                </div>
                                {profile.biography && (
                                    <div className={`${styles.infoItem} ${styles.fullWidth}`}>
                                        <span className={styles.infoLabel}>Biography</span>
                                        <span className={styles.infoValue}>{profile.biography}</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Profile;
