import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LoadingSpinner } from './';

const PrivateRoute = ({ children, allowedRoles }) => {
    const { user, loading, isAuthenticated } = useAuth();

    if (loading) {
        return <LoadingSpinner />;
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles && !allowedRoles.includes(user?.role)) {
        // User doesn't have permission - redirect to appropriate dashboard
        if (user?.role === 'regular') {
            return <Navigate to="/regular/dashboard" replace />;
        } else if (user?.role === 'business') {
            return <Navigate to="/business/dashboard" replace />;
        } else if (user?.role === 'administrator') {
            return <Navigate to="/admin" replace />;
        }
        return <Navigate to="/" replace />;
    }

    return children;
};

export default PrivateRoute;
