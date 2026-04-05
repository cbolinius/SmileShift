import { useState, useEffect } from 'react';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { adminService } from '../../services/admin';
import styles from '../pages.module.css';

export default function AdminUsers() {
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [filters, setFilters] = useState({ activated: '', suspended: '' });
  const [error, setError] = useState('');
  const [toggling, setToggling] = useState({});
  const limit = 10;

  const load = () => {
    setError('');
    const params = { page, limit };
    if (keyword.trim()) params.keyword = keyword.trim();
    if (filters.activated !== '') params.activated = filters.activated;
    if (filters.suspended !== '') params.suspended = filters.suspended;
    adminService.getUsers(params).then(setData).catch(() => setError('Failed to load users'));
  };

  useEffect(load, [page, filters]);

  const handleSearch = e => { e.preventDefault(); setPage(1); load(); };

  const handleSuspend = async (userId, currentlySuspended) => {
    setToggling(t => ({ ...t, [userId]: true }));
    try {
      await adminService.suspendUser(userId, !currentlySuspended);
      load();
    } catch (e) { setError(e.response?.data?.error || 'Action failed'); }
    finally { setToggling(t => ({ ...t, [userId]: false })); }
  };

  const totalPages = data ? Math.ceil(data.count / limit) : 1;

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1>Users</h1>

        {error && <div className={`${styles.alert} ${styles.alertError}`}>{error}</div>}

        <div className={styles.filters}>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8 }}>
            <input className={styles.input} style={{ maxWidth: 280 }}
              placeholder="Search by name, email, phone…"
              value={keyword} onChange={e => setKeyword(e.target.value)} />
            <Button type="submit">Search</Button>
          </form>
          <select className={styles.select} style={{ maxWidth: 180 }} value={filters.activated}
            onChange={e => { setFilters(f => ({ ...f, activated: e.target.value })); setPage(1); }}>
            <option value="">All Activation</option>
            <option value="true">Activated</option>
            <option value="false">Not Activated</option>
          </select>
          <select className={styles.select} style={{ maxWidth: 160 }} value={filters.suspended}
            onChange={e => { setFilters(f => ({ ...f, suspended: e.target.value })); setPage(1); }}>
            <option value="">All Status</option>
            <option value="false">Active</option>
            <option value="true">Suspended</option>
          </select>
        </div>

        {!data ? <LoadingSpinner /> : (
          <Card>
            <p className={styles.muted} style={{ marginBottom: 12 }}>
              {data.count} user{data.count !== 1 ? 's' : ''}
            </p>
            {data.results.length === 0 ? (
              <div className={styles.empty}>No users match your filters.</div>
            ) : (
              <>
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr><th>Name</th><th>Email</th><th>Activated</th><th>Status</th><th>Action</th></tr>
                    </thead>
                    <tbody>
                      {data.results.map(u => (
                        <tr key={u.id}>
                          <td><strong>{u.first_name} {u.last_name}</strong></td>
                          <td className={styles.muted}>{u.email}</td>
                          <td>
                            {u.activated
                              ? <span className={`${styles.badge} ${styles.badgeGreen}`}>Yes</span>
                              : <span className={`${styles.badge} ${styles.badgeGray}`}>No</span>}
                          </td>
                          <td>
                            {u.suspended
                              ? <span className={`${styles.badge} ${styles.badgeRed}`}>Suspended</span>
                              : <span className={`${styles.badge} ${styles.badgeGreen}`}>Active</span>}
                          </td>
                          <td>
                            <Button
                              size="sm"
                              variant={u.suspended ? 'success' : 'danger'}
                              onClick={() => handleSuspend(u.id, u.suspended)}
                              disabled={!!toggling[u.id]}
                            >
                              {toggling[u.id] ? '…' : u.suspended ? 'Unsuspend' : 'Suspend'}
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
              </>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
