import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from './';
import ThemeToggle from './ThemeToggle';
import styles from './Navbar.module.css';

function Navbar() {
    const { user, logout, isAuthenticated, isRegular, isBusiness, isAdmin } = useAuth();
    const navigate = useNavigate();

    const getDisplayName = () => {
        if (!user) return 'Guest';
        if (isRegular) {
            if (user.first_name && user.last_name) return `${user.first_name} ${user.last_name}`;
            return user.email?.split('@')[0] || 'User';
        }
        if (isBusiness) return user.business_name || 'Business';
        if (isAdmin) return 'Administrator';
        return 'User';
    };

    const getAvatarUrl = () => {
        if (!user) return null;
        if ((isRegular || isBusiness) && user.avatar) return `http://localhost:3000${user.avatar}`;
        return null;
    };

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <nav className={styles.navbar}>
            <div className={styles.container}>
                <Link to="/" className={styles.logo}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>SmileShift</span>
                        <img src="../SmileShiftLogo.svg" alt="SmileShift" width="28" height="28" />
                    </div>
                </Link>

                <div className={styles.right}>
                    <ThemeToggle />
                    {!isAuthenticated && (
                        <Link to="/businesses" className={styles.link}>Businesses</Link>
                    )}
                    {isAuthenticated ? (
                        <>
                            {getAvatarUrl() && (
                                <img src={getAvatarUrl()} alt={getDisplayName()} className={styles.avatar} />
                            )}
                            <span className={styles.userName}>{getDisplayName()}</span>
                            <Button variant="danger" size="sm" onClick={handleLogout} className={styles.logoutButton}>Logout</Button>
                        </>
                    ) : (
                        <>
                            <Link to="/login" className={styles.link}>Login</Link>
                            <div className={styles.dropdown}>
                                <Button variant="secondary" size="smmd" className={styles.dropdownButton}>
                                    Sign Up
                                </Button>
                                <div className={styles.dropdownContent}>
                                    <Link to="/register/regular" className={styles.dropdownLink}>As Regular User</Link>
                                    <Link to="/register/business" className={styles.dropdownLink}>As Business</Link>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
}

export default Navbar;
