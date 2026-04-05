import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { regularService } from '../../services/regular';
import { Button, LoadingSpinner, Pagination, CountdownTimer } from '../../components/common';
import { useNegotiation } from '../../context/NegotiationContext';
import { useAuth } from '../../context/AuthContext';
import styles from './Interests.module.css';

function Interests() {
    const navigate = useNavigate();
    const { isRegular } = useAuth();
    const { startNegotiation, loading: negotiationLoading } = useNegotiation();
    const [interests, setInterests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [actionError, setActionError] = useState('');
    const [negotiationInfo, setNegotiationInfo] = useState({});
    const [fetchingInfo, setFetchingInfo] = useState(false);
    const [pagination, setPagination] = useState({
        currentPage: 1,
        totalPages: 1,
        totalCount: 0,
        limit: 10
    });

    const fetchInterests = async (page = 1) => {
        setLoading(true);
        setError('');
        try {
            const data = await regularService.getInterests({ page, limit: 10 });
            setInterests(data.results);
            setPagination({
                currentPage: page,
                totalPages: Math.ceil(data.count / 10),
                totalCount: data.count,
                limit: 10
            });

            // Only fetch negotiation info for mutual interests
            const mutualInterests = data.results.filter(i => i.mutual);
            if (mutualInterests.length > 0) {
                const infoMap = {};
                for (const interest of mutualInterests) {
                    try {
                        const info = await regularService.getNegotiationForInterest(interest.interest_id);
                        const myDecision = isRegular ? info.candidateDecision : info.businessDecision;
                            infoMap[interest.interest_id] = {
                                ...info,
                                myDecision
                            };
                    } catch (err) {
                        // Silently fail
                    }
                }
                setNegotiationInfo(infoMap);
            }
        } catch (err) {
            setError('Failed to load interests');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInterests();
    }, []);

    const handleStartNegotiation = async (interestId) => {
        setActionError('');
        const result = await startNegotiation(interestId);
        if (result.success) {
            navigate('/negotiation');
        } else {
            setActionError(result.error);
            setTimeout(() => setActionError(''), 5000);
        }
    };

    const handleTimerExpire = () => {
        fetchInterests(pagination.currentPage);
    };

    const getNegotiationStatus = (interest) => {
        const info = negotiationInfo[interest.interest_id];
        if (!info) return null;

        if (info.status === 'active') {
            // Check if the negotiation is actually expired based on expiresAt
            const isExpired = info.expiresAt ? new Date(info.expiresAt) < new Date() : false;
            return {
                status: isExpired ? 'expired' : 'active',
                label: isExpired ? 'Negotiate Again' : 'Resume Negotiation',
                expiresAt: info.expiresAt,
                myDecision: info.myDecision,
                isExpired: isExpired
            };
        }
        if (info.status === 'failed') {
            return {
                status: 'failed',
                label: 'Negotiate Again',
                expiresAt: null,
                myDecision: info.myDecision
            };
        }
        if (info.status === 'success') {
            return {
                status: 'filled',
                label: 'Job Filled',
                expiresAt: null,
                myDecision: info.myDecision
            };
        }
        return null;
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleDateString('en-CA', {
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

    const isJobFilled = (interest) => {
        return interest.job.status === 'filled';
    };

    if (loading) return <LoadingSpinner />;

    if (error) {
        return (
            <div className={styles.errorContainer}>
                <p className={styles.error}>{error}</p>
                <Button variant="primary" onClick={() => fetchInterests()}>Retry</Button>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <h1 className={styles.pageTitle}>My Interests</h1>
            <p className={styles.subtitle}>
                Jobs you've expressed interest in
            </p>

            {actionError && (
                <div className={styles.errorBanner}>{actionError}</div>
            )}

            {interests.length === 0 ? (
                <div className={styles.empty}>
                    <p>You haven't expressed interest in any jobs yet.</p>
                    <p className={styles.mutedText}>
                        Browse jobs and click "I'm Interested" to get started.
                    </p>
                    <Button variant="primary" onClick={() => navigate('/jobs')}>
                        Browse Jobs
                    </Button>
                </div>
            ) : (
                <>
                    <div className={styles.list}>
                        {interests.map(interest => {
                            const negotiationStatus = getNegotiationStatus(interest);
                            const isFilled = isJobFilled(interest);
                            const isActiveNegotiation = negotiationStatus?.status === 'active' && !negotiationStatus?.isExpired;
                            const isExpiredNegotiation = negotiationStatus?.status === 'expired' || (negotiationStatus?.status === 'active' && negotiationStatus?.isExpired);
                            const isFailedNegotiation = negotiationStatus?.status === 'failed';

                            return (
                                <div
                                    key={interest.interest_id}
                                    className={`${styles.interestCard} ${isActiveNegotiation ? styles.activeNegotiationCard : ''} ${isFilled ? styles.filledCard : ''}`}
                                >
                                    <div className={styles.cardHeader}>
                                        <div>
                                            <h3 className={styles.jobTitle}>
                                                {interest.job.position_type.name}
                                            </h3>
                                            <p className={styles.businessName}>
                                                {interest.job.business.business_name}
                                            </p>
                                        </div>
                                        <div className={styles.mutualIndicator}>
                                            {interest.mutual ? (
                                                <span className={styles.mutualBadge}>
                                                    Mutual Interest
                                                </span>
                                            ) : (
                                                <span className={styles.pendingBadge}>
                                                    Business hasn't responded
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className={styles.jobDetails}>
                                        <div className={styles.detailItem}>
                                            <span className={styles.detailLabel}>Salary</span>
                                            <span className={styles.detailValue}>
                                                {formatSalary(interest.job.salary_min, interest.job.salary_max)}
                                            </span>
                                        </div>
                                        <div className={styles.detailItem}>
                                            <span className={styles.detailLabel}>Start</span>
                                            <span className={styles.detailValue}>
                                                {formatDate(interest.job.start_time)}
                                            </span>
                                        </div>
                                        <div className={styles.detailItem}>
                                            <span className={styles.detailLabel}>End</span>
                                            <span className={styles.detailValue}>
                                                {formatDate(interest.job.end_time)}
                                            </span>
                                        </div>
                                    </div>

                                    {interest.mutual && !isFilled && (
                                        <div className={styles.negotiationSection}>
                                            {isActiveNegotiation && negotiationStatus?.expiresAt && !negotiationStatus?.isExpired && (
                                                <div className={styles.timerSection}>
                                                    <CountdownTimer expiresAt={negotiationStatus.expiresAt} />
                                                    <span className={styles.timerLabel}>remaining</span>
                                                </div>
                                            )}
                                            <Button
                                                variant={isActiveNegotiation ? "secondary" : "primary"}
                                                size="md"
                                                onClick={() => handleStartNegotiation(interest.interest_id)}
                                                disabled={negotiationLoading || isFilled}
                                                fullWidth
                                            >
                                                {negotiationLoading ? 'Loading...' :
                                                 isActiveNegotiation ? 'Resume Negotiation' :
                                                 (isExpiredNegotiation || isFailedNegotiation) ? 'Negotiate Again' :
                                                 'Start Negotiation'}
                                            </Button>
                                            {isActiveNegotiation && (
                                                <p className={styles.negotiationHint}>
                                                    {negotiationStatus?.myDecision === 'accept'
                                                        ? `Waiting for ${interest.job.business.business_name} to respond... Click to continue chatting.`
                                                        : 'You have an active negotiation for this job. Click to continue chatting.'}
                                                </p>
                                            )}
                                            {isExpiredNegotiation && (
                                                <p className={styles.negotiationHint}>
                                                    Previous negotiation expired. You can try again.
                                                </p>
                                            )}
                                            {isFailedNegotiation && (
                                                <p className={styles.negotiationHint}>
                                                    Previous negotiation failed. You can try again.
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {isFilled && (
                                        <div className={styles.filledSection}>
                                            <p className={styles.filledMessage}>
                                                This job has been filled
                                            </p>
                                        </div>
                                    )}

                                    {!interest.mutual && !isFilled && (
                                        <div className={styles.waitingSection}>
                                            <p className={styles.waitingMessage}>
                                                Waiting for the business to express interest...
                                            </p>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <Pagination
                        currentPage={pagination.currentPage}
                        totalPages={pagination.totalPages}
                        onPageChange={fetchInterests}
                    />
                </>
            )}
        </div>
    );
}

export default Interests;
