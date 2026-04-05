import { Button, Card } from '../common';
import styles from './JobCard.module.css';

function JobCard({ job, isUrgent, onInterest }) {
    return (
        <Card
            variant={isUrgent ? 'elevated' : 'default'}
            className={`${styles.jobCard} ${isUrgent ? styles.urgent : ''}`}
        >
            <div className={styles.header}>
                <h3 className={styles.jobTitle}>{job.position_type.name}</h3>
                <span className={`${styles.badge} ${isUrgent ? styles.urgentBadge : ''}`}>
                    {job.status}
                </span>
            </div>

            <div className={styles.details}>
                <p className={styles.business}>{job.business.business_name}</p>
                <p className={styles.salary}>
                    ${job.salary_min} - ${job.salary_max}/hr
                </p>
                <p className={styles.schedule}>
                    {new Date(job.start_time).toLocaleDateString()}
                </p>
            </div>

            {onInterest && (
                <button
                    className={styles.interestButton}
                    onClick={() => onInterest(job.id)}
                >
                    Express Interest
                </button>
            )}
        </Card>
    ); // ^ convert button to Button
}

export default JobCard;
