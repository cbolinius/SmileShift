import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { regularService } from '../../services/regular';
import { Button, LoadingSpinner } from '../../components/common';
import styles from './JobDetail.module.css';

function JobDetail() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [job, setJob] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [forbidden, setForbidden] = useState(false);

    const [isInterested, setIsInterested] = useState(false);
    const [isMutual, setIsMutual] = useState(false);
    const [interestLoading, setInterestLoading] = useState(false);
    const [interestError, setInterestError] = useState('');
    const [interestSuccess, setInterestSuccess] = useState('');

    const [coords, setCoords] = useState(null);

    // Get geolocation
    useEffect(() => {
        if (!navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition(
            (pos) => setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
            () => {}
        );
    }, []);

    // Fetch job + interest state once coords resolve (or immediately if denied)
    useEffect(() => {
        const fetchAll = async () => {
            setLoading(true);
            setError('');
            setForbidden(false);
            try {
                const params = {};
                if (coords) { params.lat = coords.lat; params.lon = coords.lon; }

                const [jobData, interestsData] = await Promise.all([
                    regularService.getJobById(id, params),
                    regularService.getInterests({ limit: 100 }),
                ]);

                setJob(jobData);

                const match = interestsData.results?.find(i => i.job?.id === parseInt(id, 10));
                setIsInterested(!!match);
                setIsMutual(match?.mutual === true);
            } catch (err) {
                if (err.response?.status === 403) {
                    setForbidden(true);
                } else {
                    setError('Failed to load job details');
                }
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        // Wait for geolocation to settle — either granted or we give it 2s max
        const timer = setTimeout(fetchAll, coords ? 0 : 1500);
        return () => clearTimeout(timer);
    }, [id, coords]);

    useEffect(() => {
        if (!interestSuccess) return;
        const t = setTimeout(() => setInterestSuccess(''), 5000);
        return () => clearTimeout(t);
    }, [interestSuccess]);

    useEffect(() => {
        if (!interestError) return;
        const t = setTimeout(() => setInterestError(''), 5000);
        return () => clearTimeout(t);
    }, [interestError]);

    const handleToggleInterest = async () => {
        setInterestLoading(true);
        setInterestError('');
        setInterestSuccess('');
        try {
            await regularService.setInterested(parseInt(id, 10), !isInterested);
            setIsInterested(prev => !prev);
            if (!isInterested) {
                setInterestSuccess('Interest expressed — the business has been notified');
            } else {
                setInterestSuccess('Interest withdrawn');
                setIsMutual(false);
            }
        } catch (err) {
            setInterestError(err.response?.data?.error || err.response?.data?.message || 'Failed to update interest');
        } finally {
            setInterestLoading(false);
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleString('en-CA', {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });
    };

    const formatSalary = (min, max) => {
        if (!min && !max) return '—';
        if (min && max) return `$${min} – $${max}/hr`;
        if (min) return `From $${min}/hr`;
        return `Up to $${max}/hr`;
    };

    if (loading) return <LoadingSpinner />;

    if (forbidden) {
        return (
            <div className={styles.centerContainer}>
                <div className={styles.forbiddenCard}>
                    <h2 className={styles.forbiddenTitle}>Qualification Required</h2>
                    <p className={styles.forbiddenText}>
                        You need an approved qualification for this position type to view this job.
                    </p>
                    <div className={styles.forbiddenActions}>
                        <Button variant="primary" onClick={() => navigate('/my-qualifications')}>
                            Manage Qualifications
                        </Button>
                        <Button variant="secondary" onClick={() => navigate('/jobs')}>
                            Back to Jobs
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.centerContainer}>
                <p className={styles.error}>{error}</p>
                <Button variant="primary" onClick={() => navigate('/jobs')}>Back to Jobs</Button>
            </div>
        );
    }

    if (!job) return null;

    return (
        <div className={styles.container}>
            <button className={styles.backBtn} onClick={() => navigate('/jobs')}>
                ← Back to Jobs
            </button>

            <div className={styles.card}>
                {/* Header */}
                <div className={styles.header}>
                    <div>
                        <h1 className={styles.jobTitle}>{job.position_type.name}</h1>
                        <p className={styles.businessName}>{job.business.business_name}</p>
                    </div>
                    <div className={styles.headerRight}>
                        <span className={styles.salaryBadge}>
                            {formatSalary(job.salary_min, job.salary_max)}
                        </span>
                        <span className={`${styles.statusBadge} ${styles[`status_${job.status}`]}`}>
                            {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                        </span>
                    </div>
                </div>

                {/* Details grid */}
                <div className={styles.detailsGrid}>
                    <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Start Time</span>
                        <span className={styles.detailValue}>{formatDate(job.start_time)}</span>
                    </div>
                    <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>End Time</span>
                        <span className={styles.detailValue}>{formatDate(job.end_time)}</span>
                    </div>
                    {job.distance != null && (
                        <div className={styles.detailItem}>
                            <span className={styles.detailLabel}>Distance</span>
                            <span className={styles.detailValue}>{job.distance} km</span>
                        </div>
                    )}
                    {job.eta != null && (
                        <div className={styles.detailItem}>
                            <span className={styles.detailLabel}>ETA</span>
                            <span className={styles.detailValue}>{job.eta} min</span>
                        </div>
                    )}
                    {job.note && (
                        <div className={`${styles.detailItem} ${styles.fullWidth}`}>
                            <span className={styles.detailLabel}>Note</span>
                            <span className={styles.detailValue}>{job.note}</span>
                        </div>
                    )}
                </div>

                {/* Mutual interest banner */}
                {isMutual && (
                    <div className={styles.mutualBanner}>
                        Mutual interest reached! Head to <button className={styles.inlineLink} onClick={() => navigate('/interests')}>My Interests</button> to start a negotiation.
                    </div>
                )}

                {/* Interest action */}
                {job.status === 'open' && (
                    <div className={styles.interestSection}>
                        {interestSuccess && <p className={styles.successMsg}>{interestSuccess}</p>}
                        {interestError && <p className={styles.errorMsg}>{interestError}</p>}

                        <Button
                            variant={isInterested ? 'danger' : 'primary'}
                            size="md"
                            onClick={handleToggleInterest}
                            disabled={interestLoading}
                        >
                            {interestLoading
                                ? 'Updating...'
                                : isInterested
                                    ? 'Withdraw Interest'
                                    : "I'm Interested"}
                        </Button>

                        {isInterested && !isMutual && (
                            <p className={styles.interestNote}>
                                You have expressed interest. Waiting for the business to respond.
                            </p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default JobDetail;
