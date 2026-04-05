import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { regularService } from '../../services/regular';
import { useAuth } from '../../context/AuthContext';
import { Button, LoadingSpinner } from '../../components/common';
import styles from './Qualifications.module.css';

const API_BASE = 'http://localhost:3000';

const STATUS_LABELS = {
    created: 'Draft',
    submitted: 'Pending Review',
    approved: 'Approved',
    rejected: 'Rejected',
    revised: 'Under Review',
};

const STATUS_BADGE_CLASS = {
    created: styles.badgeDefault,
    submitted: styles.badgeInfo,
    approved: styles.badgeSuccess,
    rejected: styles.badgeDanger,
    revised: styles.badgeWarning,
};

function Qualifications() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { isRegular, isAdmin, isBusiness } = useAuth();

    const [qualification, setQualification] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [forbidden, setForbidden] = useState(false);

    useEffect(() => {
        if (!id) {
            // No id — redirect to appropriate page
            if (isRegular) navigate('/my-qualifications', { replace: true });
            else if (isAdmin) navigate('/admin/qualifications', { replace: true });
            else setLoading(false);
            return;
        }

        const fetchQualification = async () => {
            setLoading(true);
            setError('');
            setForbidden(false);
            try {
                const data = await regularService.getQualificationById(id);
                setQualification(data);
            } catch (err) {
                if (err.response?.status === 403) setForbidden(true);
                else if (err.response?.status === 404) setError('Qualification not found');
                else setError('Failed to load qualification');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchQualification();
    }, [id, isRegular, isAdmin]);

    const getBackPath = () => {
        if (isRegular) return '/my-qualifications';
        if (isAdmin) return '/admin/qualifications';
        return -1;
    };

    if (loading) return <LoadingSpinner />;

    if (forbidden) {
        return (
            <div className={styles.centerContainer}>
                <div className={styles.messageCard}>
                    <h2 className={styles.messageTitle}>Access Denied</h2>
                    <p className={styles.messageText}>You don't have permission to view this qualification.</p>
                    <Button variant="primary" onClick={() => navigate(getBackPath())}>Go Back</Button>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.centerContainer}>
                <div className={styles.messageCard}>
                    <p className={styles.errorText}>{error}</p>
                    <Button variant="primary" onClick={() => navigate(getBackPath())}>Go Back</Button>
                </div>
            </div>
        );
    }

    if (!qualification) return null;

    return (
        <div className={styles.container}>
            <button className={styles.backBtn} onClick={() => navigate(getBackPath())}>
                ← Back
            </button>

            <div className={styles.card}>
                {/* Header */}
                <div className={styles.header}>
                    <div>
                        <h1 className={styles.title}>{qualification.position_type.name}</h1>
                        {qualification.position_type.description && (
                            <p className={styles.ptDescription}>{qualification.position_type.description}</p>
                        )}
                    </div>
                    {qualification.status && (
                        <span className={`${styles.badge} ${STATUS_BADGE_CLASS[qualification.status] || styles.badgeDefault}`}>
                            {STATUS_LABELS[qualification.status] || qualification.status}
                        </span>
                    )}
                </div>

                {/* User info (regular + admin only) */}
                {qualification.user && (
                    <div className={styles.section}>
                        <h2 className={styles.sectionTitle}>Applicant</h2>
                        <div className={styles.userRow}>
                            {qualification.user.avatar && (
                                <img
                                    src={`${API_BASE}${qualification.user.avatar}`}
                                    alt="avatar"
                                    className={styles.avatar}
                                />
                            )}
                            <div className={styles.userInfo}>
                                <p className={styles.userName}>
                                    {qualification.user.first_name} {qualification.user.last_name}
                                </p>
                                {qualification.user.email && (
                                    <p className={styles.userDetail}>{qualification.user.email}</p>
                                )}
                                {qualification.user.phone_number && (
                                    <p className={styles.userDetail}>{qualification.user.phone_number}</p>
                                )}
                            </div>
                        </div>

                        {qualification.user.biography && (
                            <p className={styles.biography}>{qualification.user.biography}</p>
                        )}

                        {qualification.user.resume && (
                            <a
                                href={`${API_BASE}${qualification.user.resume}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.docLink}
                            >
                                View Resume
                            </a>
                        )}
                    </div>
                )}

                {/* Qualification details */}
                <div className={styles.section}>
                    <h2 className={styles.sectionTitle}>Details</h2>
                    <div className={styles.detailsGrid}>
                        <div className={styles.detailItem}>
                            <span className={styles.detailLabel}>Last Updated</span>
                            <span className={styles.detailValue}>
                                {new Date(qualification.updatedAt).toLocaleDateString('en-CA', {
                                    year: 'numeric', month: 'short', day: 'numeric'
                                })}
                            </span>
                        </div>
                        {qualification.user?.birthday && (
                            <div className={styles.detailItem}>
                                <span className={styles.detailLabel}>Date of Birth</span>
                                <span className={styles.detailValue}>{qualification.user.birthday}</span>
                            </div>
                        )}
                    </div>

                    {qualification.note && (
                        <div className={styles.noteBox}>
                            <span className={styles.detailLabel}>Note</span>
                            <p className={styles.noteText}>{qualification.note}</p>
                        </div>
                    )}
                </div>

                {/* Document */}
                {qualification.document && (
                    <div className={styles.section}>
                        <h2 className={styles.sectionTitle}>Supporting Document</h2>
                        <a
                            href={`${API_BASE}${qualification.document}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.docLink}
                        >
                            View Document (PDF)
                        </a>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Qualifications;
