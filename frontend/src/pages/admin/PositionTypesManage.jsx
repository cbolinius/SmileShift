import { useState, useEffect } from 'react';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { adminService } from '../../services/admin';
import styles from '../pages.module.css';

export default function PositionTypesManage() {
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', hidden: true });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState({});
  const limit = 10;

  const load = () => {
    setError('');
    const params = { page, limit };
    if (keyword.trim()) params.keyword = keyword.trim();
    adminService.getPositionTypes(params).then(setData).catch(() => setError('Failed to load position types'));
  };

  useEffect(load, [page]);

  const openCreate = () => { setForm({ name: '', description: '', hidden: true }); setModal('create'); setSuccess(''); setError(''); };
  const openEdit = (pt) => { setForm({ name: pt.name, description: pt.description, hidden: pt.hidden }); setModal(pt); setSuccess(''); setError(''); };

  const handleSave = async () => {
    if (!form.name.trim() || !form.description.trim()) { setError('Name and description are required'); return; }
    setSaving(true); setError('');
    try {
      if (modal === 'create') {
        await adminService.createPositionType(form);
        setSuccess('Position type created!');
      } else {
        await adminService.updatePositionType(modal.id, form);
        setSuccess('Updated!');
      }
      setModal(null); load();
    } catch (e) { setError(e.response?.data?.error || 'Save failed'); }
    finally { setSaving(false); }
  };

  const handleToggleHidden = async (pt) => {
    try {
      await adminService.updatePositionType(pt.id, { hidden: !pt.hidden });
      load();
    } catch { setError('Failed to update visibility'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this position type?')) return;
    setDeleting(d => ({ ...d, [id]: true }));
    try {
      await adminService.deletePositionType(id);
      setSuccess('Deleted!'); load();
    } catch (e) { setError(e.response?.data?.error || 'Cannot delete — has qualified users'); }
    finally { setDeleting(d => ({ ...d, [id]: false })); }
  };

  const totalPages = data ? Math.ceil(data.count / limit) : 1;

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.headerRow}>
          <h1>Position Types</h1>
          <Button onClick={openCreate}>+ New Position Type</Button>
        </div>

        {error && <div className={`${styles.alert} ${styles.alertError}`}>{error}</div>}
        {success && <div className={`${styles.alert} ${styles.alertSuccess}`}>{success}</div>}

        <div className={styles.filters}>
          <form onSubmit={e => { e.preventDefault(); setPage(1); load(); }} style={{ display: 'flex', gap: 8 }}>
            <input className={styles.input} style={{ maxWidth: 220 }} placeholder="Search…"
              value={keyword} onChange={e => setKeyword(e.target.value)} />
            <Button type="submit">Search</Button>
          </form>
        </div>

        {!data ? <LoadingSpinner /> : (
          <Card>
            {data.results.length === 0 ? (
              <div className={styles.empty}>No position types yet.</div>
            ) : (
              <>
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr><th>Name</th><th>Description</th><th>Qualified</th><th>Visible</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                      {data.results.map(pt => (
                        <tr key={pt.id}>
                          <td style={{ verticalAlign: 'middle' }}><strong>{pt.name}</strong></td>
                          <td className={styles.muted} style={{ maxWidth: 260, verticalAlign: 'middle' }}>{pt.description}</td>
                          <td style={{ verticalAlign: 'middle' }}>{pt.num_qualified ?? 0}</td>
                          <td style={{ verticalAlign: 'middle' }}>
                            {pt.hidden
                              ? <span className={`${styles.badge} ${styles.badgeGray}`}>Hidden</span>
                              : <span className={`${styles.badge} ${styles.badgeGreen}`}>Visible</span>}
                          </td>
                          <td style={{ verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'flex-start' }}>
                            <Button size="sm" variant="secondary" onClick={() => openEdit(pt)}>Edit</Button>
                            <Button size="sm" variant="secondary" onClick={() => handleToggleHidden(pt)}>
                              {pt.hidden ? 'Show' : 'Hide'}
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => handleDelete(pt.id)}
                              disabled={!!deleting[pt.id] || pt.num_qualified > 0}
                              title={pt.num_qualified > 0 ? 'Cannot delete — has qualified users' : ''}
                            >
                              {deleting[pt.id] ? '…' : 'Delete'}
                            </Button>
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
              </>
            )}
          </Card>
        )}

        {/* Modal */}
        {modal !== null && (
          <div className={styles.overlay}>
            <div className={styles.modal}>
              <h2 className={styles.modalTitle}>
                {modal === 'create' ? 'New Position Type' : `Edit: ${modal.name}`}
              </h2>
              {error && <div className={`${styles.alert} ${styles.alertError}`}>{error}</div>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <label className={styles.label}>Name *
                  <input className={styles.input} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </label>
                <label className={styles.label}>Description *
                  <textarea className={styles.textarea} rows={3} value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.875rem', fontWeight: 500 }}>
                  <input type="checkbox" checked={form.hidden}
                    onChange={e => setForm(f => ({ ...f, hidden: e.target.checked }))} />
                  Hidden (not visible to regular users)
                </label>
              </div>
              <div className={styles.formActions} style={{ marginTop: 20 }}>
                <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
                <Button variant="secondary" onClick={() => { setModal(null); setError(''); }}>Cancel</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
