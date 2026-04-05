import { useState, useEffect } from 'react';
import { regularService } from '../../services/regular';
import { Button, LoadingSpinner, Pagination } from '../../components/common';
import styles from './Invitations.module.css';

function Invitations() {
    const [invitations, setInvitations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, totalCount: 0, limit: 10 });

    const [actionLoading, setActionLoading] = useState(null); // job id
    const [actionError, setActionError] = useState('');
    const [actionSuccess, setActionSuccess] = useState('');

    const fetchInvitations = async (page = 1) => {
        setLoading(true);
        setError('');
        try {
            const data = await regularService.getInvitations({ page, limit: pagination.limit });
            setInvitations(data.results);
            setPagination(prev => ({
                ...prev,
                currentPage: page,
                totalPages: Math.ceil(data.count / prev.limit),
                totalCount: data.count,
            }));
        } catch (err) {
            setError('Failed to load invitations');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInvitations();
    }, []);

    useEffect(() => {
        if (!actionSuccess) return;
        const t = setTimeout(() => setActionSuccess(''), 5000);
        return () => clearTimeout(t);
    }, [actionSuccess]);

    useEffect(() => {
        if (!actionError) return;
        const t = setTimeout(() => setActionError(''), 5000);
        return () => clearTimeout(t);
    }, [actionError]);

    const handleAccept = async (jobId) => {
        setActionLoading(jobId);
        setActionError('');
        setActionSuccess('');
        try {
            await regularService.setInterested(jobId, true);
            setActionSuccess('Interest expressed — the business will be notified');
            await fetchInvitations(pagination.currentPage);
        } catch (err) {
            setActionError(err.response?.data?.error || err.response?.data?.message || 'Failed to accept invitation');
        } finally {
            setActionLoading(null);
        }
    };

    const handleDecline = async (jobId) => {
        setActionLoading(jobId);
        setActionError('');
        setActionSuccess('');
        try {
            await regularService.setInterested(jobId, false);
            setActionSuccess('Invitation declined');
            await fetchInvitations(pagination.currentPage);
        } catch (err) {
            setActionError(err.response?.data?.error || err.response?.data?.message || 'Failed to decline invitation');
        } finally {
            setActionLoading(null);
        }
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

    if (loading) return <LoadingSpinner />;

    if (error) {
        return (
            <div className={styles.errorContainer}>
                <p className={styles.error}>{error}</p>
                <Button variant="primary" onClick={() => fetchInvitations()}>Retry</Button>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <h1 className={styles.pageTitle}>My Invitations</h1>
            <p className={styles.subtitle}>
                Jobs where a business has invited you to express interest
            </p>

            {actionSuccess && <div className={styles.successBanner}>{actionSuccess}</div>}
            {actionError && <div className={styles.errorBanner}>{actionError}</div>}

            {invitations.length === 0 ? (
                <div className={styles.empty}>
                    <p>No pending invitations.</p>
                    <p className={styles.mutedText}>When a business invites you to a job, it will appear here.</p>
                </div>
            ) : (
                <>
                    <div className={styles.list}>
                        {invitations.map(inv => (
                            <div key={inv.id} className={styles.invCard}>
                                <div className={styles.invHeader}>
                                    <div>
                                        <h3 className={styles.positionName}>{inv.position_type.name}</h3>
                                        <p className={styles.businessName}>{inv.business.business_name}</p>
                                    </div>
                                    <span className={styles.salaryBadge}>
                                        {formatSalary(inv.salary_min, inv.salary_max)}
                                    </span>
                                </div>

                                <div className={styles.invDetails}>
                                    <div className={styles.detailItem}>
                                        <span className={styles.detailLabel}>Start</span>
                                        <span className={styles.detailValue}>{formatDate(inv.start_time)}</span>
                                    </div>
                                    <div className={styles.detailItem}>
                                        <span className={styles.detailLabel}>End</span>
                                        <span className={styles.detailValue}>{formatDate(inv.end_time)}</span>
                                    </div>
                                </div>

                                <div className={styles.invActions}>
                                    <Button
                                        variant="primary"
                                        size="sm"
                                        onClick={() => handleAccept(inv.id)}
                                        disabled={actionLoading === inv.id}
                                    >
                                        {actionLoading === inv.id ? 'Expressing interest...' : 'I\'m Interested'}
                                    </Button>
                                    <Button
                                        variant="danger"
                                        size="sm"
                                        onClick={() => handleDecline(inv.id)}
                                        disabled={actionLoading === inv.id}
                                    >
                                        {actionLoading === inv.id ? 'Declining...' : 'Not Interested'}
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <Pagination
                        currentPage={pagination.currentPage}
                        totalPages={pagination.totalPages}
                        onPageChange={fetchInvitations}
                    />
                </>
            )}
        </div>
    );
}

export default Invitations;
