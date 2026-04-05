import { useState, useEffect } from 'react';
import { regularService } from '../../services/regular';
import { Button, LoadingSpinner, Pagination } from '../../components/common';
import styles from './Dashboard.module.css';

const STATUS_LABELS = {
    filled: 'Filled',
    completed: 'Completed',
    canceled: 'Canceled',
};

const STATUS_BADGE_CLASS = {
    filled: styles.badgeInfo,
    completed: styles.badgeSuccess,
    canceled: styles.badgeDanger,
};

function Dashboard() {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, totalCount: 0, limit: 10 });
    const [allStats, setAllStats] = useState({ total: 0, completed: 0, upcoming: 0 });

    // Fetch stats from all jobs (no filter) — runs once
    useEffect(() => {
        const fetchStats = async () => {
            try {
                const [all, completed, filled] = await Promise.all([
                    regularService.getMyJobs({ page: 1, limit: 1 }),
                    regularService.getMyJobs({ page: 1, limit: 1, status: 'completed' }),
                    regularService.getMyJobs({ page: 1, limit: 1, status: 'filled' }),
                ]);
                setAllStats({ total: all.count, completed: completed.count, upcoming: filled.count });
            } catch (err) {
                console.error(err);
            }
        };
        fetchStats();
    }, []);

    const fetchJobs = async (page = 1, status = statusFilter) => {
        setLoading(true);
        setError('');
        try {
            const params = { page, limit: pagination.limit };
            if (status) params.status = status;
            const data = await regularService.getMyJobs(params);
            setJobs(data.results);
            setPagination(prev => ({
                ...prev,
                currentPage: page,
                totalPages: Math.ceil(data.count / prev.limit) || 1,
                totalCount: data.count,
            }));
        } catch (err) {
            setError('Failed to load work history');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchJobs(1, statusFilter);
    }, [statusFilter]);

    const formatDate = (dateStr) => {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleDateString('en-CA', {
            year: 'numeric', month: 'short', day: 'numeric',
        });
    };

    const formatSalary = (min, max) => {
        if (!min && !max) return '—';
        if (min && max) return `$${min} – $${max}/hr`;
        if (min) return `From $${min}/hr`;
        return `Up to $${max}/hr`;
    };

    return (
        <div className={styles.container}>
            <h1 className={styles.pageTitle}>Dashboard</h1>
            <p className={styles.subtitle}>Your work history</p>

            {/* Stats row — always reflects all jobs regardless of filter */}
            <div className={styles.statsRow}>
                <div className={styles.statCard}>
                    <span className={styles.statValue}>{allStats.total}</span>
                    <span className={styles.statLabel}>Total Jobs</span>
                </div>
                <div className={styles.statCard}>
                    <span className={styles.statValue}>{allStats.completed}</span>
                    <span className={styles.statLabel}>Completed</span>
                </div>
                <div className={styles.statCard}>
                    <span className={styles.statValue}>{allStats.upcoming}</span>
                    <span className={styles.statLabel}>Upcoming</span>
                </div>
            </div>

            {/* Filter */}
            <div className={styles.filterRow}>
                <span className={styles.filterLabel}>Filter by status:</span>
                <div className={styles.filterButtons}>
                    {['', 'filled', 'completed', 'canceled'].map(s => (
                        <button
                            key={s}
                            className={`${styles.filterBtn} ${statusFilter === s ? styles.filterBtnActive : ''}`}
                            onClick={() => setStatusFilter(s)}
                        >
                            {s === '' ? 'All' : STATUS_LABELS[s]}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <LoadingSpinner />
            ) : error ? (
                <div className={styles.errorContainer}>
                    <p className={styles.error}>{error}</p>
                    <Button variant="primary" onClick={() => fetchJobs()}>Retry</Button>
                </div>
            ) : jobs.length === 0 ? (
                <div className={styles.empty}>
                    <p>No work history found.</p>
                    <p className={styles.mutedText}>Jobs you complete will appear here.</p>
                </div>
            ) : (
                <>
                    <div className={styles.list}>
                        {jobs.map(job => (
                            <div key={job.id} className={styles.jobCard}>
                                <div className={styles.jobHeader}>
                                    <div>
                                        <h3 className={styles.jobTitle}>{job.position_type.name}</h3>
                                        <p className={styles.businessName}>{job.business.business_name}</p>
                                    </div>
                                    <span className={`${styles.badge} ${STATUS_BADGE_CLASS[job.status] || styles.badgeDefault}`}>
                                        {STATUS_LABELS[job.status] || job.status}
                                    </span>
                                </div>

                                <div className={styles.jobDetails}>
                                    <div className={styles.detailItem}>
                                        <span className={styles.detailLabel}>Salary</span>
                                        <span className={styles.detailValue}>{formatSalary(job.salary_min, job.salary_max)}</span>
                                    </div>
                                    <div className={styles.detailItem}>
                                        <span className={styles.detailLabel}>Start</span>
                                        <span className={styles.detailValue}>{formatDate(job.start_time)}</span>
                                    </div>
                                    <div className={styles.detailItem}>
                                        <span className={styles.detailLabel}>End</span>
                                        <span className={styles.detailValue}>{formatDate(job.end_time)}</span>
                                    </div>
                                    <div className={styles.detailItem}>
                                        <span className={styles.detailLabel}>Updated</span>
                                        <span className={styles.detailValue}>{formatDate(job.updatedAt)}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <Pagination
                        currentPage={pagination.currentPage}
                        totalPages={pagination.totalPages}
                        onPageChange={(page) => fetchJobs(page)}
                    />
                </>
            )}
        </div>
    );
}

export default Dashboard;
