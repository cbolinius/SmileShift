import styles from './Pagination.module.css';
import { Button } from './';

function Pagination({ currentPage, totalPages, onPageChange }) {
    const getPageNumbers = () => {
        const pages = [];
        const maxVisible = 5;

        if (totalPages <= maxVisible) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            if (currentPage <= 3) {
                for (let i = 1; i <= 4; i++) pages.push(i);
                pages.push('...');
                pages.push(totalPages);
            } else if (currentPage >= totalPages - 2) {
                pages.push(1);
                pages.push('...');
                for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
            } else {
                pages.push(1);
                pages.push('...');
                for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
                pages.push('...');
                pages.push(totalPages);
            }
        }
        return pages;
    };

    if (totalPages <= 1) return null;

    return (
        <div className={styles.container}>
            <Button
                variant="secondary"
                size="sm"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className={currentPage === 1 ? styles.disabled : ''}
            >
                Previous
            </Button>

            {getPageNumbers().map((page, index) => (
                page === '...' ? (
                    <span key={`dots-${index}`} className={styles.dots}>...</span>
                ) : (
                    <Button
                        key={page}
                        variant={currentPage === page ? "primary" : "secondary"}
                        size="sm"
                        onClick={() => onPageChange(page)}
                        className={currentPage === page ? styles.active : ''}
                    >
                        {page}
                    </Button>
                )
            ))}

            <Button
                variant="secondary"
                size="sm"
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={currentPage === totalPages ? styles.disabled : ''}
            >
                Next
            </Button>
        </div>
    );
}

export default Pagination;
