import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { regularService } from '../../services/regular';
import { publicService } from '../../services/public';
import { Button, LoadingSpinner, Pagination } from '../../components/common';
import styles from './Jobs.module.css';

const SORT_OPTIONS = [
    { value: 'start_time', label: 'Start Date' },
    { value: 'salary_min', label: 'Min Salary' },
    { value: 'salary_max', label: 'Max Salary' },
    { value: 'distance', label: 'Distance', requiresGeo: true },
    { value: 'eta', label: 'ETA', requiresGeo: true },
];

function Jobs() {
    const navigate = useNavigate();

    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, totalCount: 0, limit: 10 });

    // Filters
    const [positionTypes, setPositionTypes] = useState([]);
    const [positionTypeId, setPositionTypeId] = useState('');
    const [sort, setSort] = useState('start_time');
    const [order, setOrder] = useState('asc');

    // Geolocation
    const [coords, setCoords] = useState(null); // { lat, lon }
    const [geoStatus, setGeoStatus] = useState('pending'); // pending | granted | denied

    // Request geolocation on mount
    useEffect(() => {
        if (!navigator.geolocation) {
            setGeoStatus('denied');
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
                setGeoStatus('granted');
            },
            () => {
                setGeoStatus('denied');
                // If current sort needs geo, fall back
                setSort(prev => (prev === 'distance' || prev === 'eta') ? 'start_time' : prev);
            }
        );
    }, []);

    // Load position types for filter dropdown
    useEffect(() => {
        publicService.getPositionTypes({ limit: 100 })
            .then(data => setPositionTypes(data.results))
            .catch(err => console.error(err));
    }, []);

    const fetchJobs = useCallback(async (page = 1) => {
        setLoading(true);
        setError('');
        try {
            const params = { page, limit: pagination.limit, sort, order };
            if (positionTypeId) params.position_type_id = positionTypeId;
            if (coords && (sort === 'distance' || sort === 'eta')) {
                params.lat = coords.lat;
                params.lon = coords.lon;
            }
            // Always send coords if available so distance/eta values show on cards
            if (coords) {
                params.lat = coords.lat;
                params.lon = coords.lon;
            }
            const data = await regularService.getJobs(params);
            setJobs(data.results);
            setPagination(prev => ({
                ...prev,
                currentPage: page,
                totalPages: Math.ceil(data.count / prev.limit) || 1,
                totalCount: data.count,
            }));
        } catch (err) {
            setError('Failed to load jobs');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [sort, order, positionTypeId, coords, pagination.limit]);

    // Refetch when filters change
    useEffect(() => {
        // Wait until geolocation is resolved before first fetch
        if (geoStatus === 'pending') return;
        fetchJobs(1);
    }, [sort, order, positionTypeId, geoStatus]);

    const handlePageChange = (page) => fetchJobs(page);

    const handleSortChange = (newSort) => {
        if ((newSort === 'distance' || newSort === 'eta') && geoStatus !== 'granted') return;
        setSort(newSort);
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' });
    };

    const formatSalary = (min, max) => {
        if (!min && !max) return '—';
        if (min && max) return `$${min} – $${max}/hr`;
        if (min) return `From $${min}/hr`;
        return `Up to $${max}/hr`;
    };

    return (
        <div className={styles.container}>
            <h1 className={styles.pageTitle}>Find Jobs</h1>

            {/* Filters bar */}
            <div className={styles.filtersBar}>
                {/* Position type */}
                <div className={styles.filterGroup}>
                    <label className={styles.filterLabel}>Position Type</label>
                    <select
                        className={styles.select}
                        value={positionTypeId}
                        onChange={e => setPositionTypeId(e.target.value)}
                    >
                        <option value="">All Types</option>
                        {positionTypes.map(pt => (
                            <option key={pt.id} value={pt.id}>{pt.name}</option>
                        ))}
                    </select>
                </div>

                {/* Sort by */}
                <div className={styles.filterGroup}>
                    <label className={styles.filterLabel}>Sort By</label>
                    <select
                        className={styles.select}
                        value={sort}
                        onChange={e => handleSortChange(e.target.value)}
                    >
                        {SORT_OPTIONS.filter(o => !o.requiresGeo || geoStatus === 'granted').map(o => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                    </select>
                </div>

                {/* Order */}
                <div className={styles.filterGroup}>
                    <label className={styles.filterLabel}>Order</label>
                    <select
                        className={styles.select}
                        value={order}
                        onChange={e => setOrder(e.target.value)}
                    >
                        <option value="asc">Ascending</option>
                        <option value="desc">Descending</option>
                    </select>
                </div>

                {/* Geo status note */}
                {geoStatus === 'denied' && (
                    <p className={styles.geoNote}>
                        Location unavailable — distance &amp; ETA sorting disabled
                    </p>
                )}
                {geoStatus === 'granted' && (
                    <p className={styles.geoGranted}>Location detected</p>
                )}
            </div>

            <p className={styles.subtitle}>
                {pagination.totalCount} open position{pagination.totalCount !== 1 ? 's' : ''} available
            </p>

            {loading ? (
                <LoadingSpinner />
            ) : error ? (
                <div className={styles.errorContainer}>
                    <p className={styles.error}>{error}</p>
                    <Button variant="primary" onClick={() => fetchJobs()}>Retry</Button>
                </div>
            ) : jobs.length === 0 ? (
                <div className={styles.empty}>
                    <p>No jobs found.</p>
                    <p className={styles.mutedText}>Try adjusting your filters.</p>
                </div>
            ) : (
                <>
                    <div className={styles.list}>
                        {jobs.map(job => (
                            <div
                                key={job.id}
                                className={styles.jobCard}
                                onClick={() => navigate(`/jobs/${job.id}`)}
                            >
                                <div className={styles.jobHeader}>
                                    <div>
                                        <h3 className={styles.jobTitle}>{job.position_type.name}</h3>
                                        <p className={styles.businessName}>{job.business.business_name}</p>
                                    </div>
                                    <span className={styles.salaryBadge}>
                                        {formatSalary(job.salary_min, job.salary_max)}
                                    </span>
                                </div>

                                <div className={styles.jobDetails}>
                                    <div className={styles.detailItem}>
                                        <span className={styles.detailLabel}>Start</span>
                                        <span className={styles.detailValue}>{formatDate(job.start_time)}</span>
                                    </div>
                                    <div className={styles.detailItem}>
                                        <span className={styles.detailLabel}>End</span>
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
                                </div>

                                <div className={styles.jobFooter}>
                                    <Button
                                        variant="primary"
                                        size="sm"
                                        onClick={e => { e.stopPropagation(); navigate(`/jobs/${job.id}`); }}
                                    >
                                        View Details
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <Pagination
                        currentPage={pagination.currentPage}
                        totalPages={pagination.totalPages}
                        onPageChange={handlePageChange}
                    />
                </>
            )}
        </div>
    );
}

export default Jobs;
