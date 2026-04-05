import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { businessService } from '../../services/business';
import styles from '../pages.module.css';

export default function Dashboard() {
  const [profile, setProfile] = useState(null);
  const [jobs, setJobs] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      businessService.getProfile(),
      businessService.getJobs({ limit: 5 }),
    ]).then(([p, j]) => { setProfile(p); setJobs(j); })
      .catch(() => setError('Failed to load dashboard'));
  }, []);

  const statusClass = s => ({
    open: styles.badgeBlue, filled: styles.badgeGreen,
    expired: styles.badgeGray, canceled: styles.badgeRed, completed: styles.badgePurple
  }[s] || styles.badgeGray);

  if (!profile && !error) return <div className={styles.page}><LoadingSpinner /></div>;

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.headerRow}>
          <div>
            <h1>Dashboard</h1>
            {profile && <p className={styles.subtitle}>Welcome back, {profile.business_name}</p>}
          </div>
          {profile?.verified && (
            <Link to="/business/jobs/create">
              <Button>+ Post a Job</Button>
            </Link>
          )}
        </div>

        {error && <div className={`${styles.alert} ${styles.alertError}`}>{error}</div>}

        {!profile?.verified && (
          <div className={`${styles.alert} ${styles.alertWarning}`}>
            ⚠️ Your business is pending verification. Job posting will be available once verified by an administrator.
          </div>
        )}

        {/* Stats */}
        {jobs && (
          <div className={styles.statsGrid}>
            {[
              { label: 'Total Jobs', value: jobs.count ?? 0 },
              { label: 'Open', value: jobs.results?.filter(j => j.status === 'open').length ?? 0 },
              { label: 'Filled', value: jobs.results?.filter(j => j.status === 'filled').length ?? 0 },
            ].map(s => (
              <div key={s.label} className={styles.statCard}>
                <div className={styles.statValue}>{s.value}</div>
                <div className={styles.statLabel}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Recent Jobs */}
        <Card title="Recent Jobs">
          <div className={styles.cardHeader} style={{ marginBottom: 0 }}>
            <span />
            <Link to="/business/jobs" className={styles.link}>View all →</Link>
          </div>
          {!jobs ? (
            <LoadingSpinner />
          ) : jobs.results?.length === 0 ? (
            <div className={styles.empty}>
              No jobs yet.{' '}
              {profile?.verified && <Link to="/business/jobs/create" className={styles.link}>Post one now</Link>}
            </div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr><th>Position</th><th>Status</th><th>Salary</th><th>Start</th><th></th></tr>
                </thead>
                <tbody>
                  {jobs.results?.map(job => (
                    <tr key={job.id}>
                      <td>{job.position_type?.name}</td>
                      <td><span className={`${styles.badge} ${statusClass(job.status)}`}>{job.status}</span></td>
                      <td>${job.salary_min}–${job.salary_max}/hr</td>
                      <td>{new Date(job.start_time).toLocaleDateString()}</td>
                      <td><Link to={`/business/jobs/${job.id}`} className={styles.link}>View</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
