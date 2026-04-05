import { useState, useEffect, useRef } from 'react';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { businessService } from '../../services/business';
import styles from '../pages.module.css';
import { BACKEND_URL } from '../../config';

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  useEffect(() => {
    businessService.getProfile()
      .then(data => { setProfile(data); setForm(data); })
      .catch(() => setError('Failed to load profile'));
  }, []);

  const handleSave = async () => {
    setSaving(true); setError(''); setSuccess('');
    try {
      const payload = {
        business_name: form.business_name,
        owner_name: form.owner_name,
        phone_number: form.phone_number,
        postal_address: form.postal_address,
        biography: form.biography,
      };
      if (form.location) payload.location = form.location;
      const updated = await businessService.updateProfile(payload);
      setProfile(prev => ({ ...prev, ...updated }));
      setSuccess('Profile updated!');
      setEditing(false);
    } catch (e) {
      setError(e.response?.data?.error || 'Update failed');
    } finally { setSaving(false); }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true); setError('');
    try {
      const data = await businessService.uploadAvatar(file);
      setProfile(prev => ({ ...prev, avatar: data.avatar }));
      setSuccess('Avatar updated!');
    } catch {
      setError('Avatar upload failed. Must be PNG/JPEG under 10MB.');
    } finally { setUploading(false); }
  };

  if (!profile) return (
    <div className={styles.page}>
      <LoadingSpinner />
    </div>
  );

  const avatarUrl = profile.avatar ? `${BACKEND_URL}${profile.avatar}` : null;

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.headerRow}>
          <h1>Business Profile</h1>
          {!editing && (
            <Button onClick={() => { setEditing(true); setSuccess(''); }}>
              Edit Profile
            </Button>
          )}
        </div>

        {error && <div className={`${styles.alert} ${styles.alertError}`}>{error}</div>}
        {success && <div className={`${styles.alert} ${styles.alertSuccess}`}>{success}</div>}

        <div className={styles.profileCard}>
          {/* Avatar */}
          <div className={styles.avatarSection}>
            <div>
              {avatarUrl
                ? <img src={avatarUrl} alt="avatar" className={styles.avatarImg} />
                : <div className={styles.avatarPlaceholder}>{profile.business_name?.[0]?.toUpperCase()}</div>
              }
            </div>
            <Button variant="secondary" size="sm" onClick={() => fileRef.current.click()} disabled={uploading}>
              {uploading ? 'Uploading…' : 'Change Avatar'}
            </Button>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg" style={{ display: 'none' }} onChange={handleAvatarUpload} />
          </div>

          {/* Info */}
          <div className={styles.profileInfo}>
            {editing ? (
              <div className={styles.formGrid}>
                <label className={styles.label}>Business Name
                  <input className={styles.input} value={form.business_name || ''} onChange={e => setForm(f => ({ ...f, business_name: e.target.value }))} />
                </label>
                <label className={styles.label}>Owner Name
                  <input className={styles.input} value={form.owner_name || ''} onChange={e => setForm(f => ({ ...f, owner_name: e.target.value }))} />
                </label>
                <label className={styles.label}>Phone Number
                  <input className={styles.input} value={form.phone_number || ''} onChange={e => setForm(f => ({ ...f, phone_number: e.target.value }))} />
                </label>
                <label className={styles.label}>Postal Address
                  <input className={styles.input} value={form.postal_address || ''} onChange={e => setForm(f => ({ ...f, postal_address: e.target.value }))} />
                </label>
                <label className={`${styles.label} ${styles.fullCol}`}>Biography
                  <textarea className={styles.textarea} rows={4} value={form.biography || ''} onChange={e => setForm(f => ({ ...f, biography: e.target.value }))} />
                </label>
                <div className={`${styles.formActions} ${styles.fullCol}`}>
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? 'Saving…' : 'Save Changes'}
                  </Button>
                  <Button variant="secondary" onClick={() => { setEditing(false); setForm(profile); }}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <dl className={styles.dl}>
                <div className={styles.dlRow}><dt>Business Name</dt><dd>{profile.business_name}</dd></div>
                <div className={styles.dlRow}><dt>Owner</dt><dd>{profile.owner_name}</dd></div>
                <div className={styles.dlRow}><dt>Email</dt><dd>{profile.email}</dd></div>
                <div className={styles.dlRow}><dt>Phone</dt><dd>{profile.phone_number || '—'}</dd></div>
                <div className={styles.dlRow}><dt>Address</dt><dd>{profile.postal_address || '—'}</dd></div>
                <div className={styles.dlRow}>
                  <dt>Status</dt>
                  <dd>
                    <span className={`${styles.badge} ${profile.verified ? styles.badgeGreen : styles.badgeYellow}`}>
                      {profile.verified ? '✓ Verified' : 'Pending Verification'}
                    </span>
                  </dd>
                </div>
                {profile.biography && (
                  <div className={styles.dlRow}><dt>Biography</dt><dd>{profile.biography}</dd></div>
                )}
                {profile.location && (
                  <div className={styles.dlRow}>
                    <dt>Location</dt>
                    <dd>Lat {profile.location.lat?.toFixed(4)}, Lon {profile.location.lon?.toFixed(4)}</dd>
                  </div>
                )}
              </dl>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
