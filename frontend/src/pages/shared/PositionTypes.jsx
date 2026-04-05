import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { publicService } from '../../services/public';
import { useAuth } from '../../context/AuthContext';
import { LoadingSpinner, Pagination, Button } from '../../components/common';
import styles from './PositionTypes.module.css';

function PositionTypes() {
    const [positionTypes, setPositionTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [keyword, setKeyword] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [pagination, setPagination] = useState({
        currentPage: 1,
        totalPages: 1,
        totalCount: 0,
        limit: 10
    });

    const { isRegular } = useAuth();
    const navigate = useNavigate();

    const fetchPositionTypes = async (page = 1, kw = keyword) => {
        setLoading(true);
        setError('');

        try {
            const params = { page, limit: pagination.limit };
            if (kw.trim()) params.keyword = kw.trim();

            const data = await publicService.getPositionTypes(params);

            setPositionTypes(data.results);
            setPagination(prev => ({
                ...prev,
                currentPage: page,
                totalPages: Math.ceil(data.count / prev.limit),
                totalCount: data.count
            }));
        } catch (err) {
            setError('Failed to load position types');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPositionTypes();
    }, []);

    const handleSearch = (e) => {
        e.preventDefault();
        setKeyword(searchInput);
        fetchPositionTypes(1, searchInput);
    };

    const handlePageChange = (page) => {
        fetchPositionTypes(page);
    };

    if (loading) return <LoadingSpinner />;

    if (error) {
        return (
            <div className={styles.errorContainer}>
                <p className={styles.error}>{error}</p>
                <Button variant="primary" onClick={() => fetchPositionTypes()}>
                    Retry
                </Button>
            </div>
        );
    }

    return (
        <div className={styles.pageWrapper}>
            <div className={styles.container}>
                <div className={styles.pageHeader}>
                    <h1 className={styles.title}>Position Types</h1>
                    {isRegular && (
                        <Button variant="primary" size="md" onClick={() => navigate('/my-qualifications')}>
                            Request Qualification
                        </Button>
                    )}
                </div>

                <form onSubmit={handleSearch} className={styles.searchBar}>
                    <input
                        type="text"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        placeholder="Search by name or description..."
                        className={styles.searchInput}
                    />
                    <Button type="submit" variant="primary" size="md">
                        Search
                    </Button>
                    {keyword && (
                        <Button
                            type="button"
                            variant="secondary"
                            size="md"
                            onClick={() => {
                                setSearchInput('');
                                setKeyword('');
                                fetchPositionTypes(1, '');
                            }}
                        >
                            Clear
                        </Button>
                    )}
                </form>

                {positionTypes.length === 0 ? (
                    <p className={styles.empty}>No position types found.</p>
                ) : (
                    <>
                        <div className={styles.grid}>
                            {positionTypes.map(pt => (
                                <div key={pt.id} className={styles.card}>
                                    <h3 className={styles.ptName}>{pt.name}</h3>
                                    <p className={styles.ptDescription}>{pt.description}</p>
                                </div>
                            ))}
                        </div>

                        <Pagination
                            currentPage={pagination.currentPage}
                            totalPages={pagination.totalPages}
                            onPageChange={handlePageChange}
                        />
                    </>
                )}
            </div>
        </div>
    );
}

export default PositionTypes;
