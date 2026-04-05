import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { businessService } from '../../services/business';
import styles from '../pages.module.css';

export default function JobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [interests, setInterests] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [noShowing, setNoShowing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showNoShowConfirm, setShowNoShowConfirm] = useState(false);

  const load = () => {
    businessService.getJob(id)
      .then(j => { setJob(j); setForm({ salary_min: j.salary_min, salary_max: j.salary_max, note: j.note || '' }); })
      .catch(() => setError('Job not found'));
    businessService.getJobInterests(id)
      .then(setInterests).catch(() => {});
  };

  useEffect(load, [id]);

  const canEdit = job?.status === 'open' && new Date() < new Date(job?.start_time);
  const canDelete = ['open', 'expired'].includes(job?.status);
  const canNoShow = () => {
    if (!job || job.status !== 'filled') return false;
    const now = new Date();
    return now >= new Date(job.start_time) && now < new Date(job.end_time);
  };

  const handleSave = async () => {
    setSaving(true); setError(''); setSuccess('');
    try {
      const data = {};
      if (parseFloat(form.salary_min) !== job.salary_min) data.salary_min = parseFloat(form.salary_min);
      if (parseFloat(form.salary_max) !== job.salary_max) data.salary_max = parseFloat(form.salary_max);
      if (form.note !== job.note) data.note = form.note;
      if (Object.keys(data).length === 0) { setEditing(false); setSaving(false); return; }
      await businessService.updateJob(id, data);
      setSuccess('Job updated!'); setEditing(false); load();
    } catch (e) { setError(e.response?.data?.error || 'Update failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await businessService.deleteJob(id);
      navigate('/business/jobs');
    } catch (e) {
      setError(e.response?.data?.error || 'Delete failed');
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleNoShow = async () => {
    setNoShowing(true);
    try {
      await businessService.reportNoShow(id);
      setSuccess('No-show reported.');
      setShowNoShowConfirm(false);
      load();
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to report no-show');
      setShowNoShowConfirm(false);
    } finally { setNoShowing(false); }
  };

  const statusClass = s => ({
    open: styles.badgeBlue, filled: styles.badgeGreen,
    expired: styles.badgeGray, canceled: styles.badgeRed, completed: styles.badgePurple
  }[s] || styles.badgeGray);

  if (!job && !error) return <div className={styles.page}><LoadingSpinner /></div>;

  return (
    <div className={styles.page}>
      <div className={`${styles.container} ${styles.narrow}`}>
        <div className={styles.headerRow}>
          <Button variant="secondary" onClick={() => navigate('/business/jobs')}>← My Jobs</Button>
          <div className={styles.btnGroup}>
            {canEdit && !editing && <Button onClick={() => setEditing(true)}>Edit</Button>}
            {canDelete && (
              <Button variant="danger" onClick={() => setShowDeleteConfirm(true)} disabled={deleting}>
                {deleting ? 'Deleting…' : 'Delete'}
              </Button>
            )}
          </div>
        </div>

        {error && <div className={`${styles.alert} ${styles.alertError}`}>{error}</div>}
        {success && <div className={`${styles.alert} ${styles.alertSuccess}`}>{success}</div>}

        {job && (
          <>
            <Card>
              <div className={styles.jobHeader}>
                <div>
                  <h2 style={{ margin: '0 0 8px' }}>{job.position_type?.name}</h2>
                  <span className={`${styles.badge} ${statusClass(job.status)}`}>{job.status}</span>
                </div>
                {canNoShow() && (
                  <Button variant="danger" onClick={() => setShowNoShowConfirm(true)} disabled={noShowing}>
                    {noShowing ? 'Processing…' : '⚠ Report No-Show'}
                  </Button>
                )}
              </div>

              {editing ? (
                <div className={styles.formGrid} style={{ marginTop: 16 }}>
                  <label className={styles.label}>Min Salary ($/hr)
                    <input type="number" className={styles.input} value={form.salary_min}
                      onChange={e => setForm(f => ({ ...f, salary_min: e.target.value }))} />
                  </label>
                  <label className={styles.label}>Max Salary ($/hr)
                    <input type="number" className={styles.input} value={form.salary_max}
                      onChange={e => setForm(f => ({ ...f, salary_max: e.target.value }))} />
                  </label>
                  <label className={`${styles.label} ${styles.fullCol}`}>Note
                    <textarea className={styles.textarea} rows={3} value={form.note}
                      onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
                  </label>
                  <div className={`${styles.formActions} ${styles.fullCol}`}>
                    <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
                    <Button variant="secondary" onClick={() => setEditing(false)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <dl className={styles.dl} style={{ marginTop: 16 }}>
                  <div className={styles.dlRow}><dt>Salary</dt><dd>${job.salary_min}–${job.salary_max}/hr</dd></div>
                  <div className={styles.dlRow}><dt>Start</dt><dd>{new Date(job.start_time).toLocaleString()}</dd></div>
                  <div className={styles.dlRow}><dt>End</dt><dd>{new Date(job.end_time).toLocaleString()}</dd></div>
                  {job.worker && (
                    <div className={styles.dlRow}>
                      <dt>Worker</dt><dd>{job.worker.first_name} {job.worker.last_name}</dd>
                    </div>
                  )}
                  {job.note && <div className={styles.dlRow}><dt>Note</dt><dd>{job.note}</dd></div>}
                </dl>
              )}
            </Card>

            {job.status === 'open' && (
              <Card>
                <div className={styles.cardHeader}>
                  <h3 className={styles.cardTitle}>Interested Candidates</h3>
                  <Link to={`/business/jobs/${id}/candidates`} className={styles.link}>Browse all candidates →</Link>
                </div>
                {!interests ? <LoadingSpinner /> : interests.results?.length === 0 ? (
                  <div className={styles.empty}>No candidates have expressed interest yet.</div>
                ) : (
                  <div className={styles.tableWrap}>
                    <table className={styles.table}>
                      <thead><tr><th>Name</th><th>Mutual</th><th></th></tr></thead>
                      <tbody>
                        {interests.results?.map(i => (
                          <tr key={i.interest_id}>
                            <td>{i.user?.first_name} {i.user?.last_name}</td>
                            <td>
                              {i.mutual
                                ? <span className={`${styles.badge} ${styles.badgeGreen}`}>Mutual ✓</span>
                                : <span className={`${styles.badge} ${styles.badgeGray}`}>One-sided</span>}
                            </td>
                            <td>
                              <Link to={`/business/jobs/${id}/candidates/${i.user?.id}`}>
                                <Button size="sm">View</Button>
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            )}
          </>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className={styles.overlay}>
          <div className={styles.modal}>
            <h2 className={styles.modalTitle}>Delete Job</h2>
            <p style={{ color: 'var(--text)', marginBottom: 20 }}>
              Are you sure you want to delete this job? This cannot be undone.
            </p>
            <div className={styles.formActions}>
              <Button variant="danger" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Deleting…' : 'Yes, Delete'}
              </Button>
              <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* No-Show Confirmation Modal */}
      {showNoShowConfirm && (
        <div className={styles.overlay}>
          <div className={styles.modal}>
            <h2 className={styles.modalTitle}>Report No-Show</h2>
            <p style={{ color: 'var(--text)', marginBottom: 20 }}>
              Are you sure you want to report this worker as a no-show? Their account will be suspended and this cannot be undone.
            </p>
            <div className={styles.formActions}>
              <Button variant="danger" onClick={handleNoShow} disabled={noShowing}>
                {noShowing ? 'Processing…' : 'Yes, Report'}
              </Button>
              <Button variant="secondary" onClick={() => setShowNoShowConfirm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
