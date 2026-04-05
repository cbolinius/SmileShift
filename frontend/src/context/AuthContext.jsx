import { createContext, useState, useContext, useEffect } from 'react';
import { authService } from '../services/auth';
import { isValidEmail, isValidPassword } from '../utils/validation';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [token, setToken] = useState(localStorage.getItem('token'));

    const fetchCurrentUser = async () => {
        try {
            const userData = await authService.getCurrentUser();
            setUser(userData);
            return userData;
        } catch (error) {
            console.error('Failed to fetch user:', error);
            // Clear token if invalid
            if (error.response?.status === 401) {
                logout();
            }
            return null;
        } finally {
            setLoading(false);
        }
    };

    const login = async (email, password) => {
        try {
            const data = await authService.login(email, password);
            localStorage.setItem('token', data.token);
            setToken(data.token);
            const userData = await fetchCurrentUser();
            return { success: true, user: userData };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.message || 'Login failed'
            };
        }
    };

    const registerRegular = async (userData) => {
        if (!isValidEmail(userData.email)) {
            return { success: false, error: 'Invalid email format' };
        }
        if (!isValidPassword(userData.password)) {
            return {
                success: false,
                error: 'Password must be 8-20 characters with uppercase, lowercase, number, and special character'
            };
        }

        try {
            const data = await authService.registerRegular(userData);
            // After registration, user needs to activate account (success for now)
            return { success: true, data };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.error || 'Registration failed'
            };
        }
    };

    const registerBusiness = async (businessData) => {
        if (!isValidEmail(businessData.email)) {
            return { success: false, error: 'Invalid email format' };
        }
        if (!isValidPassword(businessData.password)) {
            return {
                success: false,
                error: 'Password must be 8-20 characters with uppercase, lowercase, number, and special character'
            };
        }

        try {
            const data = await authService.registerBusiness(businessData);
            return { success: true, data };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.error || 'Registration failed'
            };
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
    };

    useEffect(() => {
        if (token) {
            fetchCurrentUser();
        } else {
            setLoading(false);
        }
    }, []);

    return (
        <AuthContext.Provider
            value={{
                user,
                loading,
                login,
                logout,
                registerRegular,
                registerBusiness,
                isAuthenticated: !!user,
                isRegular: user?.role === 'regular',
                isBusiness: user?.role === 'business',
                isAdmin: user?.role === 'administrator'
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};
