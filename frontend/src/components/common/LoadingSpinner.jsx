import styles from './LoadingSpinner.module.css';

function LoadingSpinner() {
    return (
        <div className={styles.container}>
            <div className={styles.spinner}></div>
            <p className={styles.text}>Loading...</p>
        </div>
    );
}

export default LoadingSpinner;
