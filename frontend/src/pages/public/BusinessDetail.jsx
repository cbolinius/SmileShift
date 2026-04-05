import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { publicService } from '../../services/public';
import { LoadingSpinner } from '../../components/common';
import styles from './BusinessDetail.module.css';

function BusinessDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [business, setBusiness] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchBusiness = async () => {
            try {
                const data = await publicService.getBusinessById(id);
                setBusiness(data);
            } catch (err) {
                setError('Failed to load business details');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchBusiness();
    }, [id]);

    const handleClose = () => {
        navigate('/businesses');
    };

    if (loading) return <LoadingSpinner />;

    if (error) {
        return (
            <div className={styles.errorContainer}>
                <p className={styles.error}>{error}</p>
            </div>
        );
    }

    if (!business) {
        return (
            <div className={styles.errorContainer}>
                <p>Business not found</p>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <button onClick={handleClose} className={styles.closeButton} title="Close">
                ✕
            </button>
            <div className={styles.header}>
                {business.avatar && (
                    <img
                        src={`http://localhost:3000${business.avatar}`}
                        alt={business.business_name}
                        className={styles.avatar}
                    />
                )}
                <div className={styles.headerInfo}>
                    <h1 className={styles.name}>{business.business_name}</h1>
                    <p className={styles.owner}>Owner: {business.owner_name}</p>
                </div>
            </div>

            <div className={styles.infoGrid}>
                <div className={styles.infoCard}>
                    <h3>Contact Information</h3>
                    <p><strong>Phone:</strong> {business.phone_number}</p>
                    <p><strong>Email:</strong> {business.email}</p>
                    <p><strong>Address:</strong> {business.postal_address}</p>
                </div>

                <div className={styles.infoCard}>
                    <h3>Location</h3>
                    <p><strong>Coordinates:</strong></p>
                    <p>Latitude: {business.location?.lat}</p>
                    <p>Longitude: {business.location?.lon}</p>
                </div>
            </div>

            {business.biography && (
                <div className={styles.bioCard}>
                    <h3>About</h3>
                    <p>{business.biography}</p>
                </div>
            )}

            {business.verified && (
                <div className={styles.verifiedBadge}>
                    ✓ Verified Business
                </div>
            )}
        </div>
    );
}

export default BusinessDetail;
