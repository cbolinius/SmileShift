import { useState, useEffect } from 'react';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { adminService } from '../../services/admin';
import styles from '../pages.module.css';

const CONFIG_FIELDS = [
  {
    key: 'reset_cooldown',
    label: 'Reset Cooldown',
    description: 'Minimum seconds between password reset requests from the same IP.',
    unit: 'seconds', min: 0,
    save: (v) => adminService.setResetCooldown(v),
  },
  {
    key: 'negotiation_window',
    label: 'Negotiation Window',
    description: 'Duration in seconds that a negotiation stays active before expiring.',
    unit: 'seconds', min: 1,
    save: (v) => adminService.setNegotiationWindow(v),
  },
  {
    key: 'job_start_window',
    label: 'Job Start Window',
    description: 'Maximum hours in the future a job start time can be set.',
    unit: 'hours', min: 1,
    save: (v) => adminService.setJobStartWindow(v),
  },
  {
    key: 'availability_timeout',
    label: 'Availability Timeout',
    description: 'Seconds of inactivity before a user is no longer considered available.',
    unit: 'seconds', min: 1,
    save: (v) => adminService.setAvailabilityTimeout(v),
  },
];

export default function SystemConfig() {
  const [current, setCurrent] = useState(null);
  const [values, setValues] = useState({
    reset_cooldown: '', negotiation_window: '',
    job_start_window: '', availability_timeout: '',
  });
  const [statuses, setStatuses] = useState({});

  useEffect(() => {
    adminService.getSystemConfig()
      .then(data => setCurrent(data))
      .catch(() => {});
  }, []);

  const handleSave = async (field) => {
    const raw = values[field.key];
    const val = parseFloat(raw);
    if (raw === '' || isNaN(val) || val < field.min) {
      setStatuses(s => ({ ...s, [field.key]: { type: 'error', msg: `Value must be a number ≥ ${field.min}` } }));
      return;
    }
    setStatuses(s => ({ ...s, [field.key]: { type: 'saving', msg: 'Saving…' } }));
    try {
      await field.save(val);
      setCurrent(c => ({ ...c, [field.key]: val }));
      setValues(v => ({ ...v, [field.key]: '' }));
      setStatuses(s => ({ ...s, [field.key]: { type: 'success', msg: `Saved!` } }));
      setTimeout(() => setStatuses(s => ({ ...s, [field.key]: null })), 3000);
    } catch (e) {
      setStatuses(s => ({ ...s, [field.key]: { type: 'error', msg: e.response?.data?.error || 'Failed to save' } }));
    }
  };

  return (
    <div className={styles.page}>
      <div className={`${styles.container} ${styles.narrow}`}>
        <h1>System Configuration</h1>
        <p className={styles.subtitle}>Update platform-wide settings. Changes take effect immediately.</p>

        {!current && <LoadingSpinner />}

        {current && (
          <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {CONFIG_FIELDS.map(field => {
              const status = statuses[field.key];
              return (
                <Card key={field.key}>
                  <h3 className={styles.cardTitle}>{field.label}</h3>
                  <p className={styles.muted} style={{ margin: '4px 0 8px' }}>{field.description}</p>
                  <p style={{ margin: '0 0 12px', fontSize: '0.9rem' }}>
                    Current value: <strong>{current[field.key]} {field.unit}</strong>
                  </p>

                  {status && (
                    <div className={`${styles.alert} ${status.type === 'error' ? styles.alertError : status.type === 'success' ? styles.alertSuccess : styles.alertInfo}`}
                      style={{ marginBottom: 12 }}>
                      {status.msg}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <input
                      type="number"
                      className={styles.input}
                      style={{ maxWidth: 160 }}
                      placeholder={`New value (${field.unit})`}
                      value={values[field.key]}
                      min={field.min}
                      onChange={e => {
                        setValues(v => ({ ...v, [field.key]: e.target.value }));
                        setStatuses(s => ({ ...s, [field.key]: null }));
                      }}
                    />
                    <span className={styles.muted}>{field.unit}</span>
                    <Button onClick={() => handleSave(field)} disabled={status?.type === 'saving'}>
                      {status?.type === 'saving' ? 'Saving…' : 'Save'}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
