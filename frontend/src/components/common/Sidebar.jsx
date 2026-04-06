import { NavLink } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useUi } from '../../context/UiContext';
import { regularService } from '../../services/regular';
import { businessService } from '../../services/business';
import styles from './Sidebar.module.css';

function Sidebar() {
    const { isAuthenticated, isRegular, isBusiness, isAdmin } = useAuth();
    const { sidebarCollapsed, setSidebarCollapsed, isMobile } = useUi();
    const [mutualCount, setMutualCount] = useState(0);
    const [invitationCount, setInvitationCount] = useState(0);
    const [businessMutualCount, setBusinessMutualCount] = useState(0);

    useEffect(() => {
        if (isRegular && isAuthenticated) {
            const fetchRegularCounts = async () => {
                try {
                    // Fetch mutual interests count
                    const interestsData = await regularService.getInterests({ limit: 100 });
                    const mutual = interestsData.results?.filter(i => i.mutual === true).length || 0;
                    setMutualCount(mutual);

                    // Fetch invitations count
                    const invitationsData = await regularService.getInvitations({ limit: 100 });
                    setInvitationCount(invitationsData.count || 0);
                } catch (err) {
                    console.error('Failed to fetch counts:', err);
                }
            };
            fetchRegularCounts();
            const interval = setInterval(fetchRegularCounts, 30000);
            return () => clearInterval(interval);
        }

        if (isBusiness && isAuthenticated) {
            const fetchBusinessCounts = async () => {
                try {
                    // Get all open jobs
                    const jobsData = await businessService.getJobs({ status: 'open', limit: 100 });
                    const jobs = jobsData.results || [];

                    let totalMutual = 0;
                    // For each job, fetch interests and count mutual ones
                    for (const job of jobs) {
                        try {
                            const interestsData = await businessService.getJobInterests(job.id, { limit: 100 });
                            const mutual = interestsData.results?.filter(i => i.mutual === true).length || 0;
                            totalMutual += mutual;
                        } catch (err) {
                            console.error(`Failed to fetch interests for job ${job.id}:`, err);
                        }
                    }
                    setBusinessMutualCount(totalMutual);
                } catch (err) {
                    console.error('Failed to fetch business counts:', err);
                }
            };
            fetchBusinessCounts();
            const interval = setInterval(fetchBusinessCounts, 30000);
            return () => clearInterval(interval);
        }
    }, [isRegular, isBusiness, isAuthenticated]);

    if (!isAuthenticated) return null;

    const linkClass = ({ isActive }) =>
        `${styles.link} ${isActive ? styles.active : ''}`;

    return (
        <>
        <div className={`${styles.spacer} ${sidebarCollapsed ? styles.spacerCollapsed : ''}`} />
        <aside className={`${styles.sidebar} ${sidebarCollapsed ? styles.sidebarCollapsed : ''}`}>
            {/* Header with Menu label and X button */}
                {!sidebarCollapsed && (
                    <div className={styles.sidebarHeader}>
                        <span className={styles.sidebarTitle}>Menu</span>
                        <button
                            className={styles.closeBtn}
                            onClick={() => setSidebarCollapsed(true)}
                            title="Collapse sidebar"
                        >
                            ✕
                        </button>
                    </div>
                )}

                {/* Collapsed view - only hamburger button */}
                {sidebarCollapsed && (
                    <button
                        className={styles.hamburgerBtn}
                        onClick={() => setSidebarCollapsed(false)}
                        title="Expand sidebar"
                    >
                        ☰
                    </button>
                )}

            {!sidebarCollapsed && (
                <nav className={styles.nav}>
                    {isRegular && (
                        <>
                            <NavLink to="/jobs" className={linkClass}>Find Jobs</NavLink>
                            <NavLink to="/regular/dashboard" className={linkClass}>Dashboard</NavLink>
                            <NavLink to="/regular/profile" className={linkClass}>Profile</NavLink>
                            <NavLink to="/my-qualifications" className={linkClass}>Qualifications</NavLink>
                            <NavLink to="/invitations" className={linkClass}>
                                Invitations
                                {invitationCount > 0 && (
                                    <span className={styles.badge}>
                                        <span>{invitationCount}</span>
                                    </span>
                                )}
                            </NavLink>
                            <NavLink to="/interests" className={linkClass}>
                                My Interests
                                {mutualCount > 0 && (
                                    <span className={styles.badge}>
                                        <span>{mutualCount}</span>
                                    </span>
                                )}
                            </NavLink>
                            <p className={styles.sectionLabel}>Explore</p>
                            <NavLink to="/position-types" className={linkClass}>Position Types</NavLink>
                            <NavLink to="/businesses" className={linkClass}>Businesses</NavLink>
                        </>
                    )}

                    {isBusiness && (
                        <>
                            <NavLink to="/business/jobs" className={linkClass}>My Jobs</NavLink>
                            <NavLink to="/business/dashboard" className={linkClass}>Dashboard</NavLink>
                            <NavLink to="/business/profile" className={linkClass}>Profile</NavLink>
                            <NavLink to="/business/interests" className={linkClass}>
                                Interests
                                {businessMutualCount > 0 && (
                                    <span className={styles.badge}>
                                        <span>{businessMutualCount}</span>
                                    </span>
                                )}
                            </NavLink>
                            <p className={styles.sectionLabel}>Explore</p>
                            <NavLink to="/position-types" className={linkClass}>Position Types</NavLink>
                            <NavLink to="/businesses" className={linkClass}>Businesses</NavLink>
                        </>
                    )}

                    {isAdmin && (
                        <>
                            <NavLink to="/admin" className={linkClass} end>Dashboard</NavLink>
                            <NavLink to="/admin/users" className={linkClass}>Users</NavLink>
                            <NavLink to="/admin/businesses" className={linkClass}>Businesses</NavLink>
                            <NavLink to="/admin/position-types" className={linkClass}>Position Types</NavLink>
                            <NavLink to="/admin/qualifications" className={linkClass}>Reviews</NavLink>
                            <NavLink to="/admin/system" className={linkClass}>System Config</NavLink>
                        </>
                    )}
                </nav>
            )}
        </aside>
        </>
    );
}

export default Sidebar;
