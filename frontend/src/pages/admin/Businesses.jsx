import { useState, useEffect } from 'react';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { adminService } from '../../services/admin';
import styles from '../pages.module.css';

export default function AdminBusinesses() {
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [filters, setFilters] = useState({ activated: '', verified: '' });
  const [error, setError] = useState('');
  const [toggling, setToggling] = useState({});
  const limit = 10;

  const load = () => {
    setError('');
    const params = { page, limit };
    if (keyword.trim()) params.keyword = keyword.trim();
    if (filters.activated !== '') params.activated = filters.activated;
    if (filters.verified !== '') params.verified = filters.verified;
    adminService.getBusinesses(params).then(setData).catch(() => setError('Failed to load businesses'));
  };

  useEffect(load, [page, filters]);

  const handleSearch = e => { e.preventDefault(); setPage(1); load(); };

  const handleVerify = async (bizId, currentlyVerified) => {
    setToggling(t => ({ ...t, [bizId]: true }));
    try {
      await adminService.verifyBusiness(bizId, !currentlyVerified);
      load();
    } catch (e) { setError(e.response?.data?.error || 'Action failed'); }
    finally { setToggling(t => ({ ...t, [bizId]: false })); }
  };

  const totalPages = data ? Math.ceil(data.count / limit) : 1;

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1>Businesses</h1>

        {error && <div className={`${styles.alert} ${styles.alertError}`}>{error}</div>}

        <div className={styles.filters}>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8 }}>
            <input className={styles.input} style={{ maxWidth: 260 }}
              placeholder="Search by name, email…"
              value={keyword} onChange={e => setKeyword(e.target.value)} />
            <Button type="submit">Search</Button>
          </form>
          <select className={styles.select} style={{ maxWidth: 180 }} value={filters.verified}
            onChange={e => { setFilters(f => ({ ...f, verified: e.target.value })); setPage(1); }}>
            <option value="">All Verification</option>
            <option value="true">Verified</option>
            <option value="false">Unverified</option>
          </select>
          <select className={styles.select} style={{ maxWidth: 180 }} value={filters.activated}
            onChange={e => { setFilters(f => ({ ...f, activated: e.target.value })); setPage(1); }}>
            <option value="">All Activation</option>
            <option value="true">Activated</option>
            <option value="false">Not Activated</option>
          </select>
        </div>

        {!data ? <LoadingSpinner /> : (
          <Card>
            <p className={styles.muted} style={{ marginBottom: 12 }}>
              {data.count} business{data.count !== 1 ? 'es' : ''}
            </p>
            {data.results.length === 0 ? (
              <div className={styles.empty}>No businesses match your filters.</div>
            ) : (
              <>
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr><th>Business</th><th>Owner</th><th>Email</th><th>Verified</th><th>Activated</th><th>Action</th></tr>
                    </thead>
                    <tbody>
                      {data.results.map(b => (
                        <tr key={b.id}>
                          <td><strong>{b.business_name}</strong></td>
                          <td>{b.owner_name}</td>
                          <td className={styles.muted}>{b.email}</td>
                          <td>
                            {b.verified
                              ? <span className={`${styles.badge} ${styles.badgeGreen}`}>Verified</span>
                              : <span className={`${styles.badge} ${styles.badgeYellow}`}>Pending</span>}
                          </td>
                          <td>
                            {b.activated
                              ? <span className={`${styles.badge} ${styles.badgeGreen}`}>Yes</span>
                              : <span className={`${styles.badge} ${styles.badgeGray}`}>No</span>}
                          </td>
                          <td>
                            <Button
                              size="sm"
                              variant={b.verified ? 'danger' : 'success'}
                              onClick={() => handleVerify(b.id, b.verified)}
                              disabled={!!toggling[b.id]}
                            >
                              {toggling[b.id] ? '…' : b.verified ? 'Unverify' : 'Verify'}
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
