import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { businessService } from '../../services/business';
import styles from '../pages.module.css';

export default function CreateJob() {
  const navigate = useNavigate();
  const [positionTypes, setPositionTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    position_type_id: '', salary_min: '', salary_max: '',
    start_time: '', end_time: '', note: '',
  });
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const [verified, setVerified] = useState(null);

useEffect(() => {
  Promise.all([
    businessService.getProfile(),
    businessService.getPositionTypes({ limit: 100 })
  ]).then(([p, d]) => {
    setVerified(p.verified);
    setPositionTypes(d.results || []);
    setLoading(false);
  }).catch(() => { setError('Failed to load'); setLoading(false); });
}, []);

  const set = (key, val) => {
    setForm(f => ({ ...f, [key]: val }));
    setFieldErrors(e => ({ ...e, [key]: '' }));
  };

  const validate = () => {
    const errs = {};
    if (!form.position_type_id) errs.position_type_id = 'Select a position type';
    const min = parseFloat(form.salary_min);
    const max = parseFloat(form.salary_max);
    if (!form.salary_min || isNaN(min) || min < 0) errs.salary_min = 'Enter a valid minimum salary';
    if (!form.salary_max || isNaN(max) || max < min) errs.salary_max = 'Max salary must be ≥ min salary';
    if (!form.start_time) errs.start_time = 'Start time is required';
    if (!form.end_time) errs.end_time = 'End time is required';
    if (form.start_time && form.end_time) {
      const s = new Date(form.start_time);
      const e = new Date(form.end_time);
      if (s <= new Date()) errs.start_time = 'Start time must be in the future';
      if (e <= s) errs.end_time = 'End time must be after start time';
    }
    return errs;
  };

  const handleSubmit = async () => {
    setError('');
    const errs = validate();
    if (Object.keys(errs).length > 0) { setFieldErrors(errs); return; }
    setSubmitting(true);
    try {
      const payload = {
        position_type_id: parseInt(form.position_type_id),
        salary_min: parseFloat(form.salary_min),
        salary_max: parseFloat(form.salary_max),
        start_time: new Date(form.start_time).toISOString(),
        end_time: new Date(form.end_time).toISOString(),
      };
      if (form.note.trim()) payload.note = form.note.trim();
      const job = await businessService.createJob(payload);
      navigate(`/business/jobs/${job.id}`);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to create job');
    } finally { setSubmitting(false); }
  };

  if (loading) return <div className={styles.page}><LoadingSpinner /></div>;
  if (verified === false) return (
  <div className={styles.page}>
    <div className={`${styles.container} ${styles.narrow}`}>
      <div className={styles.headerRow}>
        <h1>Post a New Job</h1>
        <Button variant="secondary" onClick={() => navigate('/business/jobs')}>← Back</Button>
      </div>
      <div className={`${styles.alert} ${styles.alertWarning}`}>
        ⚠️ Your business must be verified by an administrator before you can post jobs.
      </div>
    </div>
  </div>
);

  return (
    <div className={styles.page}>
      <div className={`${styles.container} ${styles.narrow}`}>
        <div className={styles.headerRow}>
          <h1>Post a New Job</h1>
          <Button variant="secondary" onClick={() => navigate('/business/jobs')}>← Back</Button>
        </div>

        {error && <div className={`${styles.alert} ${styles.alertError}`}>{error}</div>}

        <Card>
          <div className={styles.formGrid}>
            <label className={`${styles.label} ${styles.fullCol}`}>
              Position Type *
              <select
                className={`${styles.select} ${fieldErrors.position_type_id ? styles.inputError : ''}`}
                value={form.position_type_id}
                onChange={e => set('position_type_id', e.target.value)}
              >
                <option value="">Select a position type…</option>
                {positionTypes.map(pt => (
                  <option key={pt.id} value={pt.id}>{pt.name}</option>
                ))}
              </select>
              {fieldErrors.position_type_id && <span className={styles.fieldError}>{fieldErrors.position_type_id}</span>}
            </label>

            <label className={styles.label}>
              Min Salary ($/hr) *
              <input type="number" min="0" step="0.01"
                className={`${styles.input} ${fieldErrors.salary_min ? styles.inputError : ''}`}
                value={form.salary_min}
                onChange={e => set('salary_min', e.target.value)}
                placeholder="e.g. 25.00"
              />
              {fieldErrors.salary_min && <span className={styles.fieldError}>{fieldErrors.salary_min}</span>}
            </label>

            <label className={styles.label}>
              Max Salary ($/hr) *
              <input type="number" min="0" step="0.01"
                className={`${styles.input} ${fieldErrors.salary_max ? styles.inputError : ''}`}
                value={form.salary_max}
                onChange={e => set('salary_max', e.target.value)}
                placeholder="e.g. 40.00"
              />
              {fieldErrors.salary_max && <span className={styles.fieldError}>{fieldErrors.salary_max}</span>}
            </label>

            <label className={styles.label}>
              Start Time *
              <input type="datetime-local"
                className={`${styles.input} ${fieldErrors.start_time ? styles.inputError : ''}`}
                value={form.start_time}
                onChange={e => set('start_time', e.target.value)}
              />
              {fieldErrors.start_time && <span className={styles.fieldError}>{fieldErrors.start_time}</span>}
            </label>

            <label className={styles.label}>
              End Time *
              <input type="datetime-local"
                className={`${styles.input} ${fieldErrors.end_time ? styles.inputError : ''}`}
                value={form.end_time}
                onChange={e => set('end_time', e.target.value)}
              />
              {fieldErrors.end_time && <span className={styles.fieldError}>{fieldErrors.end_time}</span>}
            </label>

            <label className={`${styles.label} ${styles.fullCol}`}>
              Note <span className={styles.muted}>(optional)</span>
              <textarea className={styles.textarea} rows={3} value={form.note}
                onChange={e => set('note', e.target.value)}
                placeholder="Any additional details for candidates…"
              />
            </label>

            <div className={`${styles.formActions} ${styles.fullCol}`}>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Posting…' : 'Post Job'}
              </Button>
              <Button variant="secondary" onClick={() => navigate('/business/jobs')}>Cancel</Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
