import React from 'react';
import styles from './ErrorBoundary.module.css';
import { Button } from './';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
        this.setState({ error, errorInfo });
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
        if (this.props.onReset) {
            this.props.onReset();
        }
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className={styles.container}>
                    <div className={styles.card}>
                        <h2 className={styles.title}>Something went wrong</h2>
                        <p className={styles.message}>
                            We're sorry, but something unexpected happened.
                        </p>
                        {this.props.showDetails && this.state.error && (
                            <details className={styles.details}>
                                <summary>Error Details</summary>
                                <pre className={styles.errorDetails}>
                                    {this.state.error.toString()}
                                </pre>
                            </details>
                        )}
                        <div className={styles.buttons}>
                            <Button variant="primary" onClick={this.handleReset}>
                                Try Again
                            </Button>
                            <Button
                                variant="secondary"
                                onClick={() => window.location.href = '/'}
                            >
                                Go to Homepage
                            </Button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
