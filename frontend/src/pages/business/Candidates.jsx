import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { businessService } from '../../services/business';
import styles from '../pages.module.css';

export default function Candidates() {
  const { jobId } = useParams();
  const [candidates, setCandidates] = useState(null);
  const [job, setJob] = useState(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [inviting, setInviting] = useState({});
  const limit = 10;

  const load = () => {
    setError('');
    businessService.getCandidates(jobId, { page, limit })
      .then(setCandidates)
      .catch(() => setError('Failed to load candidates'));
    businessService.getJob(jobId).then(setJob).catch(() => {});
  };

  useEffect(load, [jobId, page]);

  const handleInvite = async (userId, currentlyInvited) => {
    setInviting(s => ({ ...s, [userId]: true }));
    try {
      await businessService.inviteCandidate(jobId, userId, !currentlyInvited);
      load();
    } catch (e) {
      setError(e.response?.data?.error || 'Action failed');
    } finally {
      setInviting(s => ({ ...s, [userId]: false }));
    }
  };

  const totalPages = candidates ? Math.ceil(candidates.count / limit) : 1;

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.headerRow}>
          <div>
            <Link to={`/business/jobs/${jobId}`} className={styles.linkBack}>← Back to Job</Link>
            <h1>Discoverable Candidates</h1>
            {job && <p className={styles.subtitle}>{job.position_type?.name}</p>}
          </div>
        </div>

        {error && <div className={`${styles.alert} ${styles.alertError}`}>{error}</div>}

        {!candidates ? (
          <LoadingSpinner />
        ) : candidates.results?.length === 0 ? (
          <Card>
            <div className={styles.empty}>
              No discoverable candidates for this job right now. Candidates must be available and qualified.
            </div>
          </Card>
        ) : (
          <Card>
            <p className={styles.muted} style={{ marginBottom: 12 }}>
              {candidates.count} candidate{candidates.count !== 1 ? 's' : ''} found
            </p>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr><th>Name</th><th>Invited</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {candidates.results.map(c => (
                    <tr key={c.id}>
                      <td><strong>{c.first_name} {c.last_name}</strong></td>
                      <td>
                        {c.invited
                          ? <span className={`${styles.badge} ${styles.badgeGreen}`}>Invited ✓</span>
                          : <span className={`${styles.badge} ${styles.badgeGray}`}>Not invited</span>}
                      </td>
                      <td className={styles.actionsCell}>
                        <Link to={`/business/jobs/${jobId}/candidates/${c.id}`}>
                          <Button size="sm" variant="secondary">View Profile</Button>
                        </Link>
                        <Button
                          size="sm"
                          variant={c.invited ? 'secondary' : 'success'}
                          onClick={() => handleInvite(c.id, c.invited)}
                          disabled={!!inviting[c.id]}
                        >
                          {inviting[c.id] ? '…' : c.invited ? 'Withdraw' : 'Invite'}
                        </Button>
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
