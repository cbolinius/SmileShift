import { useState, useEffect, useRef } from 'react';
import { regularService } from '../../services/regular';
import { publicService } from '../../services/public';
import { Button, LoadingSpinner, Pagination } from '../../components/common';
import styles from './MyQualifications.module.css';
import { BACKEND_URL } from '../../config';

const STATUS_LABELS = {
    created: 'Draft',
    submitted: 'Pending Review',
    approved: 'Approved',
    rejected: 'Rejected',
    revised: 'Under Review',
};

const STATUS_BADGE_CLASS = {
    created: styles.badgeDefault,
    submitted: styles.badgeInfo,
    approved: styles.badgeSuccess,
    rejected: styles.badgeDanger,
    revised: styles.badgeWarning,
};

function MyQualifications() {
    const [qualifications, setQualifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, totalCount: 0, limit: 10 });

    const [showCreateForm, setShowCreateForm] = useState(false);
    const [positionTypes, setPositionTypes] = useState([]);
    const [ptLoading, setPtLoading] = useState(false);
    const [createData, setCreateData] = useState({ position_type_id: '', note: '' });
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState('');

    const [actionLoading, setActionLoading] = useState(null); // qual id
    const [actionError, setActionError] = useState('');
    const [actionSuccess, setActionSuccess] = useState('');

    const [uploadingDoc, setUploadingDoc] = useState(null); // qual id
    const [confirmReviseId, setConfirmReviseId] = useState(null); // qual id awaiting confirm
    const [uploadError, setUploadError] = useState('');
    const [uploadSuccess, setUploadSuccess] = useState('');

    const docInputRefs = useRef({});

    // Auto-dismiss messages after 5s
    useEffect(() => {
        if (!actionSuccess) return;
        const t = setTimeout(() => setActionSuccess(''), 5000);
        return () => clearTimeout(t);
    }, [actionSuccess]);

    useEffect(() => {
        if (!actionError) return;
        const t = setTimeout(() => setActionError(''), 5000);
        return () => clearTimeout(t);
    }, [actionError]);

    useEffect(() => {
        if (!uploadSuccess) return;
        const t = setTimeout(() => setUploadSuccess(''), 5000);
        return () => clearTimeout(t);
    }, [uploadSuccess]);

    useEffect(() => {
        if (!uploadError) return;
        const t = setTimeout(() => setUploadError(''), 5000);
        return () => clearTimeout(t);
    }, [uploadError]);

    const fetchQualifications = async (page = 1) => {
        setLoading(true);
        setError('');
        try {
            const data = await regularService.getMyQualifications({ page, limit: pagination.limit });
            setQualifications(data.results);
            setPagination(prev => ({
                ...prev,
                currentPage: page,
                totalPages: Math.ceil(data.count / prev.limit),
                totalCount: data.count,
            }));
        } catch (err) {
            setError('Failed to load qualifications');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchQualifications();
    }, []);

    const loadPositionTypes = async () => {
        setPtLoading(true);
        try {
            const data = await publicService.getPositionTypes({ limit: 100 });
            setPositionTypes(data.results);
        } catch (err) {
            console.error(err);
        } finally {
            setPtLoading(false);
        }
    };

    const handleOpenCreate = () => {
        setCreateData({ position_type_id: '', note: '' });
        setCreateError('');
        setShowCreateForm(true);
        if (positionTypes.length === 0) loadPositionTypes();
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!createData.position_type_id) {
            setCreateError('Please select a position type');
            return;
        }
        setCreating(true);
        setCreateError('');
        try {
            await regularService.createQualification(parseInt(createData.position_type_id, 10), createData.note);
            setShowCreateForm(false);
            setActionSuccess('Qualification created successfully');
            await fetchQualifications(pagination.currentPage);
        } catch (err) {
            setCreateError(err.response?.data?.message || err.response?.data?.error || 'Failed to create qualification');
        } finally {
            setCreating(false);
        }
    };

    const handleSubmit = async (qualId) => {
        setActionLoading(qualId);
        setActionError('');
        setActionSuccess('');
        try {
            await regularService.updateQualification(qualId, { status: 'submitted' });
            setActionSuccess('Qualification submitted for review');
            await fetchQualifications(pagination.currentPage);
        } catch (err) {
            setActionError(err.response?.data?.message || 'Failed to submit qualification');
        } finally {
            setActionLoading(null);
        }
    };

    const handleRevise = async (qualId) => {
        setConfirmReviseId(null);
        setActionLoading(qualId);
        setActionError('');
        setActionSuccess('');
        try {
            await regularService.updateQualification(qualId, { status: 'revised' });
            setActionSuccess('Qualification marked for revision — under admin review');
            await fetchQualifications(pagination.currentPage);
        } catch (err) {
            setActionError(err.response?.data?.message || 'Failed to revise qualification');
        } finally {
            setActionLoading(null);
        }
    };

    const handleDocUpload = async (e, qualId) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploadingDoc(qualId);
        setUploadError('');
        setUploadSuccess('');
        try {
            await regularService.uploadQualificationDocument(qualId, file);
            setUploadSuccess('Document uploaded successfully');
            await fetchQualifications(pagination.currentPage);
        } catch (err) {
            setUploadError(err.response?.data?.message || 'Failed to upload document');
        } finally {
            setUploadingDoc(null);
            e.target.value = '';
        }
    };

    if (loading) return <LoadingSpinner />;

    if (error) {
        return (
            <div className={styles.errorContainer}>
                <p className={styles.error}>{error}</p>
                <Button variant="primary" onClick={() => fetchQualifications()}>Retry</Button>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <h1 className={styles.pageTitle}>My Qualifications</h1>
            <div className={styles.pageHeader}>
                <Button variant="primary" size="md" onClick={handleOpenCreate}>
                    + New Qualification
                </Button>
            </div>

            {actionSuccess && <div className={styles.successBanner}>{actionSuccess}</div>}
            {(actionError || uploadError) && (
                <div className={styles.errorBanner}>{actionError || uploadError}</div>
            )}
            {uploadSuccess && <div className={styles.successBanner}>{uploadSuccess}</div>}

            {/* Create form */}
            {showCreateForm && (
                <div className={styles.createCard}>
                    <div className={styles.createHeader}>
                        <h3 className={styles.createTitle}>Request New Qualification</h3>
                        <button
                            className={styles.closeBtn}
                            onClick={() => setShowCreateForm(false)}
                            type="button"
                        >
                            ✕
                        </button>
                    </div>
                    {createError && <p className={styles.inlineError}>{createError}</p>}
                    <form onSubmit={handleCreate} className={styles.createForm}>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Position Type</label>
                            {ptLoading ? (
                                <p className={styles.mutedText}>Loading position types...</p>
                            ) : (
                                <select
                                    className={styles.select}
                                    value={createData.position_type_id}
                                    onChange={e => setCreateData({ ...createData, position_type_id: e.target.value })}
                                    required
                                >
                                    <option value="">Select a position type...</option>
                                    {positionTypes.map(pt => (
                                        <option key={pt.id} value={pt.id}>{pt.name}</option>
                                    ))}
                                </select>
                            )}
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Note (optional)</label>
                            <textarea
                                className={styles.textarea}
                                value={createData.note}
                                onChange={e => setCreateData({ ...createData, note: e.target.value })}
                                rows={3}
                                placeholder="Add any relevant notes about your qualification..."
                            />
                        </div>
                        <div className={styles.createActions}>
                            <Button type="submit" variant="primary" size="md" disabled={creating}>
                                {creating ? 'Creating...' : 'Create'}
                            </Button>
                            <Button
                                type="button"
                                variant="secondary"
                                size="md"
                                onClick={() => setShowCreateForm(false)}
                            >
                                Cancel
                            </Button>
                        </div>
                    </form>
                </div>
            )}

            {qualifications.length === 0 ? (
                <div className={styles.empty}>
                    <p>You have no qualifications yet.</p>
                    <p className={styles.mutedText}>Create a qualification request to get started.</p>
                </div>
            ) : (
                <>
                    <div className={styles.list}>
                        {qualifications.map(qual => (
                            <div key={qual.id} className={styles.qualCard}>
                                <div className={styles.qualHeader}>
                                    <div>
                                        <h3 className={styles.qualTitle}>{qual.position_type.name}</h3>
                                        <p className={styles.qualDate}>
                                            Updated {new Date(qual.updatedAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <span className={`${styles.badge} ${STATUS_BADGE_CLASS[qual.status] || styles.badgeDefault}`}>
                                        {STATUS_LABELS[qual.status] || qual.status}
                                    </span>
                                </div>

                                {qual.note && (
                                    <p className={styles.qualNote}>{qual.note}</p>
                                )}

                                <div className={styles.qualActions}>
                                    {/* Document */}
                                    <div className={styles.docSection}>
                                        {qual.document ? (
                                            <a
                                                href={`${BACKEND_URL}${qual.document}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className={styles.docLink}
                                            >
                                                View Document
                                            </a>
                                        ) : (
                                            <span className={styles.mutedText}>No document</span>
                                        )}
                                        <input
                                            type="file"
                                            accept="application/pdf"
                                            style={{ display: 'none' }}
                                            ref={el => { docInputRefs.current[qual.id] = el; }}
                                            onChange={e => handleDocUpload(e, qual.id)}
                                        />
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => docInputRefs.current[qual.id]?.click()}
                                            disabled={uploadingDoc === qual.id}
                                        >
                                            {uploadingDoc === qual.id
                                                ? 'Uploading...'
                                                : qual.document
                                                    ? 'Replace PDF'
                                                    : 'Upload PDF'}
                                        </Button>
                                    </div>

                                    {/* Status actions */}
                                    <div className={styles.statusActions}>
                                        {qual.status === 'created' && (
                                            <Button
                                                variant="primary"
                                                size="sm"
                                                onClick={() => handleSubmit(qual.id)}
                                                disabled={actionLoading === qual.id}
                                            >
                                                {actionLoading === qual.id ? 'Submitting...' : 'Submit for Review'}
                                            </Button>
                                        )}
                                        {(qual.status === 'approved' || qual.status === 'rejected') && (
                                            confirmReviseId === qual.id ? (
                                                <div className={styles.confirmRow}>
                                                    <span className={styles.confirmText}>Are you sure?</span>
                                                    <Button
                                                        variant="danger"
                                                        size="sm"
                                                        onClick={() => handleRevise(qual.id)}
                                                        disabled={actionLoading === qual.id}
                                                    >
                                                        {actionLoading === qual.id ? 'Updating...' : 'Yes, Revise'}
                                                    </Button>
                                                    <Button
                                                        variant="secondary"
                                                        size="sm"
                                                        onClick={() => setConfirmReviseId(null)}
                                                    >
                                                        Cancel
                                                    </Button>
                                                </div>
                                            ) : (
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    onClick={() => setConfirmReviseId(qual.id)}
                                                    disabled={actionLoading === qual.id}
                                                >
                                                    Request Revision
                                                </Button>
                                            )
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <Pagination
                        currentPage={pagination.currentPage}
                        totalPages={pagination.totalPages}
                        onPageChange={fetchQualifications}
                    />
                </>
            )}
        </div>
    );
}

export default MyQualifications;
