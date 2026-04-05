import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { businessService } from '../../services/business';
import styles from '../pages.module.css';

const STATUS_OPTIONS = ['open', 'filled', 'expired', 'canceled', 'completed'];

const selectWithArrow = {
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 10px center',
  paddingRight: '32px',
  appearance: 'none',
};

export default function MyJobs() {
  const [jobs, setJobs] = useState(null);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ status: '', position_type_id: '' });
  const [positionTypes, setPositionTypes] = useState([]);
  const [error, setError] = useState('');
  const limit = 10;

  useEffect(() => {
    businessService.getPositionTypes({ limit: 100 })
      .then(d => setPositionTypes(d.results || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setError('');
    const params = { page, limit };
    if (filters.status) params.status = filters.status;
    if (filters.position_type_id) params.position_type_id = filters.position_type_id;
    businessService.getJobs(params)
      .then(setJobs)
      .catch(() => setError('Failed to load jobs'));
  }, [page, filters]);

  const handleFilter = (key, val) => {
    setFilters(f => ({ ...f, [key]: val }));
    setPage(1);
  };

  const statusClass = s => ({
    open: styles.badgeBlue, filled: styles.badgeGreen,
    expired: styles.badgeGray, canceled: styles.badgeRed, completed: styles.badgePurple
  }[s] || styles.badgeGray);

  const totalPages = jobs ? Math.ceil(jobs.count / limit) : 1;

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.headerRow}>
          <h1>My Jobs</h1>
          <Link to="/business/jobs/create">
            <Button>+ Post New Job</Button>
          </Link>
        </div>

        {error && <div className={`${styles.alert} ${styles.alertError}`}>{error}</div>}

        <div className={styles.filters}>
          <select
            className={styles.select}
            style={{ ...selectWithArrow, maxWidth: 180 }}
            value={filters.status}
            onChange={e => handleFilter('status', e.target.value)}
          >
            <option value="">All Statuses</option>
            {STATUS_OPTIONS.map(s => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
          <select
            className={styles.select}
            style={{ ...selectWithArrow, maxWidth: 220 }}
            value={filters.position_type_id}
            onChange={e => handleFilter('position_type_id', e.target.value)}
          >
            <option value="">All Position Types</option>
            {positionTypes.map(pt => (
              <option key={pt.id} value={pt.id}>{pt.name}</option>
            ))}
          </select>
        </div>

        {!jobs ? (
          <LoadingSpinner />
        ) : jobs.results?.length === 0 ? (
          <Card>
            <div className={styles.empty}>
              No jobs found.{' '}
              <Link to="/business/jobs/create" className={styles.link}>Post your first job</Link>
            </div>
          </Card>
        ) : (
          <Card>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Position</th>
                    <th>Status</th>
                    <th>Salary Range</th>
                    <th>Start Time</th>
                    <th>Worker</th>
                    <th style={{ whiteSpace: 'nowrap' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.results.map(job => (
                    <tr key={job.id} style={{ height: 56 }}>
                      <td style={{ verticalAlign: 'middle' }}><strong>{job.position_type?.name}</strong></td>
                      <td style={{ verticalAlign: 'middle' }}><span className={`${styles.badge} ${statusClass(job.status)}`}>{job.status}</span></td>
                      <td style={{ verticalAlign: 'middle', whiteSpace: 'nowrap' }}>${job.salary_min}–${job.salary_max}/hr</td>
                      <td style={{ verticalAlign: 'middle', whiteSpace: 'nowrap' }}>{new Date(job.start_time).toLocaleString()}</td>
                      <td style={{ verticalAlign: 'middle' }}>
                        {job.worker
                          ? `${job.worker.first_name} ${job.worker.last_name}`
                          : <span className={styles.muted}>—</span>}
                      </td>
                      <td style={{ verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <Link to={`/business/jobs/${job.id}`}>
                            <Button size="sm">View</Button>
                          </Link>
                          {job.status === 'open' && (
                            <Link to={`/business/jobs/${job.id}/candidates`}>
                              <Button size="sm" variant="secondary">Candidates</Button>
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className={styles.pagination}>
                <Button variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</Button>
                <span className={styles.pageInfo}>Page {page} of {totalPages}</span>
                <Button variant="secondary" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next →</Button>
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
