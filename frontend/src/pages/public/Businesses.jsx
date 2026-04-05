import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { publicService } from '../../services/public';
import { LoadingSpinner, Pagination, Card, Button } from '../../components/common';
import styles from './Businesses.module.css';

function Businesses() {
    const [businesses, setBusinesses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [pagination, setPagination] = useState({
        currentPage: 1,
        totalPages: 1,
        totalCount: 0,
        limit: 10
    });

    const fetchBusinesses = async (page = 1) => {
        setLoading(true);
        setError('');

        try {
            const data = await publicService.getBusinesses({
                page,
                limit: pagination.limit
            });

            setBusinesses(data.results);
            setPagination({
                ...pagination,
                currentPage: page,
                totalPages: Math.ceil(data.count / pagination.limit),
                totalCount: data.count
            });
        } catch (err) {
            setError('Failed to load businesses');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBusinesses();
    }, []);

    if (loading) return <LoadingSpinner />;

    if (error) {
        return (
            <div className={styles.errorContainer}>
                <p className={styles.error}>{error}</p>
                <Button variant="primary" onClick={() => fetchBusinesses()}>
                    Retry
                </Button>
            </div>
        );
    }

    return (
        <div className={styles.pageWrapper}>
            <div className={styles.container}>
                <h1 className={styles.title}>Dental Clinics</h1>

                {businesses.length === 0 ? (
                    <p className={styles.empty}>No businesses found.</p>
                ) : (
                    <>
                        <div className="grid grid-cols-3">
                            {businesses.map(business => (
                                <Link to={`/businesses/${business.id}`} key={business.id} style={{ textDecoration: 'none' }}>
                                    <Card
                                        title={business.business_name}
                                        variant="custom"
                                        className={styles.businessCard}
                                    >
                                        <p className={styles.phone}>{business.phone_number}</p>
                                        <p className={styles.address}>{business.postal_address}</p>
                                    </Card>
                                </Link>
                            ))}
                        </div>

                        <Pagination
                            currentPage={pagination.currentPage}
                            totalPages={pagination.totalPages}
                            onPageChange={fetchBusinesses}
                        />
                    </>
                )}
            </div>
        </div>
    );
}

export default Businesses;
