import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { businessService } from '../../services/business';
import styles from '../pages.module.css';

export default function CandidateDetail() {
  const { jobId, userId } = useParams();
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState('');

  useEffect(() => {
    businessService.getCandidateDetail(jobId, userId)
      .then(setDetail)
      .catch(e => setError(e.response?.data?.message || 'Candidate not found or not discoverable'));
  }, [jobId, userId]);

  const handleInvite = async (invite) => {
    setInviting(true); setError(''); setInviteSuccess('');
    try {
      await businessService.inviteCandidate(jobId, userId, invite);
      setInviteSuccess(invite ? 'Candidate invited!' : 'Invitation withdrawn.');
    } catch (e) {
      setError(e.response?.data?.error || 'Action failed');
    } finally { setInviting(false); }
  };

  if (error) return (
    <div className={styles.page}>
      <div className={`${styles.container} ${styles.narrow}`}>
        <Link to={`/business/jobs/${jobId}/candidates`} className={styles.linkBack}>← Back to Candidates</Link>
        <div className={`${styles.alert} ${styles.alertError}`} style={{ marginTop: 16 }}>{error}</div>
      </div>
    </div>
  );

  if (!detail) return <div className={styles.page}><LoadingSpinner /></div>;

  const { user, job } = detail;
  const resumeUrl = user.resume ? `http://localhost:3000${user.resume}` : null;
  const docUrl = user.qualification?.document ? `http://localhost:3000${user.qualification.document}` : null;

  return (
    <div className={styles.page}>
      <div className={`${styles.container} ${styles.narrow}`}>
        <Link to={`/business/jobs/${jobId}/candidates`} className={styles.linkBack}>← Back to Candidates</Link>

        {inviteSuccess && <div className={`${styles.alert} ${styles.alertSuccess}`} style={{ marginTop: 12 }}>{inviteSuccess}</div>}

        <Card>
          <div className={styles.jobHeader}>
            <div>
              <h2 style={{ margin: '0 0 4px' }}>{user.first_name} {user.last_name}</h2>
              {user.email && <p className={styles.muted}>{user.email}</p>}
              {user.phone_number && <p className={styles.muted}>📞 {user.phone_number}</p>}
            </div>
            <div className={styles.btnGroup}>
              <Button onClick={() => handleInvite(true)} disabled={inviting}>Invite</Button>
              <Button variant="secondary" onClick={() => handleInvite(false)} disabled={inviting}>Withdraw</Button>
            </div>
          </div>

          {user.biography && (
            <div style={{ marginTop: 16 }}>
              <p className={styles.sectionLabel}>Biography</p>
              <p>{user.biography}</p>
            </div>
          )}

          {user.qualification && (
            <div style={{ marginTop: 16 }}>
              <p className={styles.sectionLabel}>Qualification</p>
              <dl className={styles.dl}>
                {user.qualification.note && (
                  <div className={styles.dlRow}><dt>Note</dt><dd>{user.qualification.note}</dd></div>
                )}
                <div className={styles.dlRow}>
                  <dt>Last Updated</dt>
                  <dd>{new Date(user.qualification.updatedAt).toLocaleDateString()}</dd>
                </div>
                {docUrl && (
                  <div className={styles.dlRow}>
                    <dt>Document</dt>
                    <dd><a href={docUrl} target="_blank" rel="noreferrer" className={styles.link}>View PDF</a></dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          {resumeUrl && (
            <div style={{ marginTop: 16 }}>
              <a href={resumeUrl} target="_blank" rel="noreferrer">
                <Button variant="secondary">📄 View Resume</Button>
              </a>
            </div>
          )}
        </Card>

        {job && (
          <Card title="Job Details">
            <dl className={styles.dl}>
              <div className={styles.dlRow}><dt>Position</dt><dd>{job.position_type?.name}</dd></div>
              <div className={styles.dlRow}><dt>Start</dt><dd>{new Date(job.start_time).toLocaleString()}</dd></div>
              <div className={styles.dlRow}><dt>End</dt><dd>{new Date(job.end_time).toLocaleString()}</dd></div>
            </dl>
          </Card>
        )}
      </div>
    </div>
  );
}
