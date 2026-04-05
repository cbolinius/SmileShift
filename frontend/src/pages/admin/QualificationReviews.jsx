import { useState, useEffect } from 'react';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { adminService } from '../../services/admin';
import styles from '../pages.module.css';
import { BACKEND_URL } from '../../config';

const STATUS_CLASS = {
  submitted: styles.badgeBlue, revised: styles.badgeYellow,
  approved: styles.badgeGreen, rejected: styles.badgeRed, created: styles.badgeGray
};

export default function QualificationReviews() {
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [selected, setSelected] = useState(null);
  const [reviewNote, setReviewNote] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const limit = 10;

  const load = () => {
    setError('');
    const params = { page, limit };
    if (keyword.trim()) params.keyword = keyword.trim();
    adminService.getQualifications(params).then(setData).catch(() => setError('Failed to load qualifications'));
  };

  useEffect(load, [page]);

  const openReview = async (q) => {
    setSelected(null); setReviewNote(''); setError('');
    try {
      const detail = await adminService.getQualification(q.id);
      setSelected(detail);
    } catch { setError('Failed to load qualification detail'); }
  };

  const handleReview = async (status) => {
    if (!selected) return;
    setReviewing(true); setError('');
    try {
      await adminService.reviewQualification(selected.id, status, reviewNote || undefined);
      setSuccess(`Qualification ${status}!`);
      setSelected(null);
      load();
    } catch (e) { setError(e.response?.data?.message || 'Review failed'); }
    finally { setReviewing(false); }
  };

  const totalPages = data ? Math.ceil(data.count / limit) : 1;

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1>Qualification Reviews</h1>
        <p className={styles.subtitle}>Pending submissions and revisions requiring admin attention</p>

        {error && <div className={`${styles.alert} ${styles.alertError}`}>{error}</div>}
        {success && <div className={`${styles.alert} ${styles.alertSuccess}`}>{success}</div>}

        <div className={styles.filters}>
          <form onSubmit={e => { e.preventDefault(); setPage(1); load(); }} style={{ display: 'flex', gap: 8 }}>
            <input className={styles.input} style={{ maxWidth: 300 }}
              placeholder="Search by name, email, position…"
              value={keyword} onChange={e => setKeyword(e.target.value)} />
            <Button type="submit">Search</Button>
          </form>
        </div>

        {!data ? <LoadingSpinner /> : data.results.length === 0 ? (
          <Card>
            <div className={styles.empty}>No pending qualifications. All caught up! ✓</div>
          </Card>
        ) : (
          <Card>
            <p className={styles.muted} style={{ marginBottom: 12 }}>
              {data.count} pending review{data.count !== 1 ? 's' : ''}
            </p>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr><th>User</th><th>Position Type</th><th>Status</th><th>Updated</th><th>Action</th></tr>
                </thead>
                <tbody>
                  {data.results.map(q => (
                    <tr key={q.id}>
                      <td><strong>{q.user?.first_name} {q.user?.last_name}</strong></td>
                      <td>{q.position_type?.name}</td>
                      <td><span className={`${styles.badge} ${STATUS_CLASS[q.status] || styles.badgeGray}`}>{q.status}</span></td>
                      <td className={styles.muted}>{new Date(q.updatedAt).toLocaleDateString()}</td>
                      <td><Button size="sm" onClick={() => openReview(q)}>Review</Button></td>
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

        {/* Review Modal */}
        {selected && (
          <div className={styles.overlay}>
            <div className={styles.modal} style={{ maxWidth: 560 }}>
              <h2 className={styles.modalTitle}>Review Qualification</h2>
              <p className={styles.muted} style={{ marginBottom: 20 }}>
                {selected.user?.first_name} {selected.user?.last_name} — {selected.position_type?.name}
              </p>

              {error && <div className={`${styles.alert} ${styles.alertError}`}>{error}</div>}

              <dl className={styles.dl} style={{ marginBottom: 16 }}>
                <div className={styles.dlRow}>
                  <dt>Status</dt>
                  <dd><span className={`${styles.badge} ${STATUS_CLASS[selected.status] || styles.badgeGray}`}>{selected.status}</span></dd>
                </div>
                {selected.note && (
                  <div className={styles.dlRow}><dt>Applicant Note</dt><dd>{selected.note}</dd></div>
                )}
                {selected.document && (
                  <div className={styles.dlRow}>
                    <dt>Document</dt>
                    <dd>
                      <a href={`${BACKEND_URL}${selected.document}`} target="_blank" rel="noreferrer" className={styles.link}>
                        View PDF
                      </a>
                    </dd>
                  </div>
                )}
              </dl>

              <label className={styles.label} style={{ marginBottom: 16 }}>
                Admin Note <span className={styles.muted}>(optional)</span>
                <textarea className={styles.textarea} rows={3} value={reviewNote}
                  onChange={e => setReviewNote(e.target.value)}
                  placeholder="Feedback for the applicant…" />
              </label>

              <div className={styles.formActions}>
                <Button variant="success" onClick={() => handleReview('approved')} disabled={reviewing}>
                  {reviewing ? '…' : '✓ Approve'}
                </Button>
                <Button variant="danger" onClick={() => handleReview('rejected')} disabled={reviewing}>
                  {reviewing ? '…' : '✗ Reject'}
                </Button>
                <Button variant="secondary" onClick={() => setSelected(null)}>Cancel</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
