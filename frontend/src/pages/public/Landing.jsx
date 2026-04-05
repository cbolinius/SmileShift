import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import styles from './Landing.module.css';

function Landing() {
    const { isAuthenticated } = useAuth();

    return (
        <div className={styles.container}>
            <div className={styles.hero}>
                <h1 className={styles.title}>
                    Find Your Next Dental Opportunity
                </h1>
                <p className={styles.subtitle}>
                    Connect with dental clinics looking for qualified professionals
                    for short-term positions. Fast, easy, and reliable.
                </p>

                {!isAuthenticated ? (
                    <div className={styles.buttons}>
                        <Link to="/register/regular" className={styles.primaryButton}>
                            Find Work
                        </Link>
                        <Link to="/register/business" className={styles.secondaryButton}>
                            Post Jobs
                        </Link>
                    </div>
                ) : (
                    <div className={styles.buttons}>
                        <Link to="/jobs" className={styles.primaryButton}>
                            Browse Jobs
                        </Link>
                    </div>
                )}
            </div>

            <div className={styles.features}>
                <div className={styles.feature}>
                    <h3>Qualified Professionals</h3>
                    <p>All professionals are verified and qualified for their roles</p>
                </div>
                <div className={styles.feature}>
                    <h3>Quick Matching</h3>
                    <p>Find the right match quickly with our smart matching system</p>
                </div>
                <div className={styles.feature}>
                    <h3>Real-time Negotiation</h3>
                    <p>Chat directly with potential matches during negotiation</p>
                </div>
            </div>
        </div>
    );
}

export default Landing;
