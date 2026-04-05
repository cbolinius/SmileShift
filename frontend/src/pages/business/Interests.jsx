import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { businessService } from '../../services/business';
import styles from '../pages.module.css';

const selectWithArrow = {
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 10px center',
  paddingRight: '32px',
  appearance: 'none',
};

function CountdownDisplay({ expiresAt, onExpire }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const update = () => {
      const diff = new Date(expiresAt) - new Date();
      if (diff <= 0) { setTimeLeft('0:00'); onExpire?.(); return; }
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${m}:${s.toString().padStart(2, '0')}`);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      background: 'rgba(239,68,68,0.1)', color: '#ef4444',
      padding: '4px 10px', borderRadius: 8, fontSize: '0.9rem', fontWeight: 600
    }}>
      🕐 {timeLeft}
    </span>
  );
}

export default function BusinessInterests() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState(null);
  const [selectedJob, setSelectedJob] = useState('');
  const [interests, setInterests] = useState(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [starting, setStarting] = useState({});
  const [negotiationInfo, setNegotiationInfo] = useState({});
  const limit = 10;

  useEffect(() => {
    businessService.getJobs({ status: 'open', limit: 100 })
      .then(d => {
        setJobs(d.results || []);
        if (d.results?.length > 0) setSelectedJob(String(d.results[0].id));
      })
      .catch(() => setError('Failed to load jobs'));
  }, []);

  useEffect(() => {
    if (!selectedJob) return;
    setInterests(null);
    setNegotiationInfo({});
    businessService.getJobInterests(selectedJob, { page, limit })
      .then(async (data) => {
        setInterests(data);
        // Fetch negotiation info for mutual interests
        const mutuals = (data.results || []).filter(i => i.mutual);
        const infoMap = {};
        for (const i of mutuals) {
          try {
            const info = await businessService.getNegotiationForInterest(i.interest_id);
            infoMap[i.interest_id] = info;
          } catch { /* no negotiation yet */ }
        }
        setNegotiationInfo(infoMap);
      })
      .catch(() => setError('Failed to load interests'));
  }, [selectedJob, page]);

  const handleStartNegotiation = async (interestId) => {
    setStarting(s => ({ ...s, [interestId]: true }));
    setError('');
    try {
      await businessService.startNegotiation(interestId);
      navigate('/negotiation');
    } catch (e) {
      setError(e.response?.data?.message || 'Could not start negotiation');
      setStarting(s => ({ ...s, [interestId]: false }));
    }
  };

  const getNegotiationStatus = (interestId) => {
    const info = negotiationInfo[interestId];
    if (!info) return null;
    if (info.status === 'active') {
      const isExpired = info.expiresAt ? new Date(info.expiresAt) < new Date() : false;
      return { status: isExpired ? 'expired' : 'active', isExpired, expiresAt: info.expiresAt };
    }
    if (info.status === 'failed') return { status: 'failed' };
    if (info.status === 'success') return { status: 'success' };
    return null;
  };

  const totalPages = interests ? Math.ceil(interests.count / limit) : 1;

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1>Candidate Interests</h1>
        <p className={styles.subtitle}>Candidates who expressed interest in your open jobs</p>

        {error && <div className={`${styles.alert} ${styles.alertError}`}>{error}</div>}

        {jobs === null && <LoadingSpinner />}

        {jobs !== null && jobs.length === 0 && (
          <Card>
            <div className={styles.empty}>
              You have no open jobs.{' '}
              <Link to="/business/jobs/create" className={styles.link}>Post one</Link>
            </div>
          </Card>
        )}

        {jobs !== null && jobs.length > 0 && (
          <>
            <div className={styles.filters}>
              <select
                className={styles.select}
                style={{ ...selectWithArrow, maxWidth: 360 }}
                value={selectedJob}
                onChange={e => { setSelectedJob(e.target.value); setPage(1); }}
              >
                {jobs.map(j => (
                  <option key={j.id} value={j.id}>
                    {j.position_type?.name} — {new Date(j.start_time).toLocaleDateString()}
                  </option>
                ))}
              </select>
            </div>

            {!interests && <LoadingSpinner />}

            {interests && (
              interests.results?.length === 0 ? (
                <Card>
                  <div className={styles.empty}>No candidates have expressed interest in this job yet.</div>
                </Card>
              ) : (
                <Card>
                  <p className={styles.muted} style={{ marginBottom: 12 }}>
                    {interests.count} interested candidate{interests.count !== 1 ? 's' : ''}
                  </p>
                  <div className={styles.tableWrap}>
                    <table className={styles.table}>
                      <thead>
                        <tr><th>Candidate</th><th>Mutual Interest</th><th>Negotiation</th><th>Actions</th></tr>
                      </thead>
                      <tbody>
                        {interests.results.map(i => {
                          const negStatus = getNegotiationStatus(i.interest_id);
                          const isActive = negStatus?.status === 'active';
                          const isExpired = negStatus?.status === 'expired' || negStatus?.isExpired;
                          const isFailed = negStatus?.status === 'failed';
                          const isSuccess = negStatus?.status === 'success';

                          return (
                            <tr key={i.interest_id}>
                              <td><strong>{i.user?.first_name} {i.user?.last_name}</strong></td>
                              <td>
                                {i.mutual
                                  ? <span className={`${styles.badge} ${styles.badgeGreen}`}>Mutual ✓</span>
                                  : <span className={`${styles.badge} ${styles.badgeGray}`}>Candidate only</span>}
                              </td>
                              <td>
                                {isActive && negStatus.expiresAt && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <CountdownDisplay
                                      expiresAt={negStatus.expiresAt}
                                      onExpire={() => {
                                        setNegotiationInfo(prev => ({
                                          ...prev,
                                          [i.interest_id]: { ...prev[i.interest_id], status: 'failed' }
                                        }));
                                      }}
                                    />
                                    <span className={styles.muted} style={{ fontSize: '0.8rem' }}>remaining</span>
                                  </div>
                                )}
                                {(isExpired || isFailed) && (
                                  <span className={`${styles.badge} ${styles.badgeGray}`}>Expired</span>
                                )}
                                {isSuccess && (
                                  <span className={`${styles.badge} ${styles.badgeGreen}`}>Job Filled</span>
                                )}
                                {!negStatus && i.mutual && (
                                  <span className={styles.muted}>—</span>
                                )}
                              </td>
                              <td className={styles.actionsCell}>
                                <Link to={`/business/jobs/${selectedJob}/candidates/${i.user?.id}`}>
                                  <Button size="sm" variant="secondary">View</Button>
                                </Link>
                                {i.mutual && !isSuccess && (
                                  <Button
                                    size="sm"
                                    variant={isActive ? 'secondary' : 'success'}
                                    onClick={() => handleStartNegotiation(i.interest_id)}
                                    disabled={!!starting[i.interest_id]}
                                  >
                                    {starting[i.interest_id] ? '…'
                                      : isActive ? 'Resume'
                                      : (isExpired || isFailed) ? 'Negotiate Again'
                                      : 'Negotiate'}
                                  </Button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
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
              )
            )}
          </>
        )}
      </div>
    </div>
  );
}
