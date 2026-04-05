import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Navbar from './components/common/Navbar';
import Sidebar from './components/common/Sidebar';
import PrivateRoute from './components/common/PrivateRoute';
import ErrorBoundary from './components/common/ErrorBoundary';
import { NegotiationProvider } from './context/NegotiationContext';
import ToastContainer from './components/common/ToastContainer';

// Auth Pages
import Login from './pages/auth/Login';
import RegisterRegular from './pages/auth/RegisterRegular';
import RegisterBusiness from './pages/auth/RegisterBusiness';
import ResetPassword from './pages/auth/ResetPassword';
import ResetPasswordConfirm from './pages/auth/ResetPasswordConfirm';
import ActivateAccount from './pages/auth/ActivateAccount';

// Public Pages
import Landing from './pages/public/Landing';
import Businesses from './pages/public/Businesses';
import BusinessDetail from './pages/public/BusinessDetail';

// Shared Pages (to be implemented by teammates)
import Negotiation from './pages/shared/Negotiation';
import PositionTypes from './pages/shared/PositionTypes';
import Qualifications from './pages/shared/Qualifications';

// Regular User Pages (to be implemented by Member B)
import RegularDashboard from './pages/regular/Dashboard';
import RegularProfile from './pages/regular/Profile';
import Jobs from './pages/regular/Jobs';
import JobDetail from './pages/regular/JobDetail';
import MyQualifications from './pages/regular/MyQualifications';
import RegularInterests from './pages/regular/Interests';
import Invitations from './pages/regular/Invitations';

// Business Pages (to be implemented by Member C)
import BusinessDashboard from './pages/business/Dashboard';
import BusinessProfile from './pages/business/Profile';
import BusinessJobs from './pages/business/MyJobs';
import CreateJob from './pages/business/CreateJob';
import BusinessJobDetail from './pages/business/JobDetail';
import Candidates from './pages/business/Candidates';
import CandidateDetail from './pages/business/CandidateDetail';
import BusinessInterests from './pages/business/Interests';

// Admin Pages (to be implemented by Member C)
import AdminDashboard from './pages/admin/Dashboard';
import AdminUsers from './pages/admin/Users';
import AdminBusinessesList from './pages/admin/Businesses';
import AdminPositionTypes from './pages/admin/PositionTypesManage';
import QualificationReviews from './pages/admin/QualificationReviews';
import SystemConfig from './pages/admin/SystemConfig';

function App() {
    return (
        <ErrorBoundary>
            <BrowserRouter>
                <AuthProvider>
                    <SocketProvider>
                        <NegotiationProvider>
                            <Navbar />
                            <div style={{ display: 'flex', paddingTop: 'var(--navbar-height)' }}>
                                <Sidebar />
                                <div style={{ flex: 1, minWidth: 0 }} id="main-content">
                            <Routes>
                                {/* Public Routes */}
                                <Route path="/" element={<Landing />} />
                                <Route path="/businesses" element={<Businesses />} />
                                <Route path="/businesses/:id" element={<BusinessDetail />} />

                                {/* Auth Routes */}
                                <Route path="/login" element={<Login />} />
                                <Route path="/register/regular" element={<RegisterRegular />} />
                                <Route path="/register/business" element={<RegisterBusiness />} />
                                <Route path="/reset-password" element={<ResetPassword />} />
                                <Route path="/reset-password/:token" element={<ResetPasswordConfirm />} />
                                <Route path="/activate/:token" element={<ActivateAccount />} />

                                {/* Shared Routes - Multiple roles */}
                                <Route
                                    path="/position-types"
                                    element={
                                        <PrivateRoute allowedRoles={['regular', 'business', 'administrator']}>
                                            <PositionTypes />
                                        </PrivateRoute>
                                    }
                                />
                                <Route
                                    path="/negotiation"
                                    element={
                                        <PrivateRoute allowedRoles={['regular', 'business']}>
                                            <Negotiation />
                                        </PrivateRoute>
                                    }
                                />
                                <Route
                                    path="/qualifications/:id?"
                                    element={
                                        <PrivateRoute allowedRoles={['regular', 'business', 'administrator']}>
                                            <Qualifications />
                                        </PrivateRoute>
                                    }
                                />

                                {/* Regular User Routes */}
                                <Route
                                    path="/regular/dashboard"
                                    element={
                                        <PrivateRoute allowedRoles={['regular']}>
                                            <RegularDashboard />
                                        </PrivateRoute>
                                    }
                                />
                                <Route
                                    path="/regular/profile"
                                    element={
                                        <PrivateRoute allowedRoles={['regular']}>
                                            <RegularProfile />
                                        </PrivateRoute>
                                    }
                                />
                                <Route
                                    path="/jobs"
                                    element={
                                        <PrivateRoute allowedRoles={['regular']}>
                                            <Jobs />
                                        </PrivateRoute>
                                    }
                                />
                                <Route
                                    path="/jobs/:id"
                                    element={
                                        <PrivateRoute allowedRoles={['regular']}>
                                            <JobDetail />
                                        </PrivateRoute>
                                    }
                                />
                                <Route
                                    path="/my-qualifications"
                                    element={
                                        <PrivateRoute allowedRoles={['regular']}>
                                            <MyQualifications />
                                        </PrivateRoute>
                                    }
                                />
                                <Route
                                    path="/invitations"
                                    element={
                                        <PrivateRoute allowedRoles={['regular']}>
                                            <Invitations />
                                        </PrivateRoute>
                                    }
                                />
                                <Route
                                    path="/interests"
                                    element={
                                        <PrivateRoute allowedRoles={['regular']}>
                                            <RegularInterests />
                                        </PrivateRoute>
                                    }
                                />

                                {/* Business Routes */}
                                <Route
                                    path="/business/dashboard"
                                    element={
                                        <PrivateRoute allowedRoles={['business']}>
                                            <BusinessDashboard />
                                        </PrivateRoute>
                                    }
                                />
                                <Route
                                    path="/business/profile"
                                    element={
                                        <PrivateRoute allowedRoles={['business']}>
                                            <BusinessProfile />
                                        </PrivateRoute>
                                    }
                                />
                                <Route
                                    path="/business/jobs"
                                    element={
                                        <PrivateRoute allowedRoles={['business']}>
                                            <BusinessJobs />
                                        </PrivateRoute>
                                    }
                                />
                                <Route
                                    path="/business/jobs/:id"
                                    element={
                                        <PrivateRoute allowedRoles={['business']}>
                                            <BusinessJobDetail />
                                        </PrivateRoute>
                                    }
                                />
                                <Route
                                    path="/business/jobs/create"
                                    element={
                                        <PrivateRoute allowedRoles={['business']}>
                                            <CreateJob />
                                        </PrivateRoute>
                                    }
                                />
                                <Route
                                    path="/business/jobs/:jobId/candidates"
                                    element={
                                        <PrivateRoute allowedRoles={['business']}>
                                            <Candidates />
                                        </PrivateRoute>
                                    }
                                />
                                <Route
                                    path="/business/jobs/:jobId/candidates/:userId"
                                    element={
                                        <PrivateRoute allowedRoles={['business']}>
                                            <CandidateDetail />
                                        </PrivateRoute>
                                    }
                                />
                                <Route
                                    path="/business/interests"
                                    element={
                                        <PrivateRoute allowedRoles={['business']}>
                                            <BusinessInterests />
                                        </PrivateRoute>
                                    }
                                />

                                {/* Admin Routes */}
                                <Route
                                    path="/admin"
                                    element={
                                        <PrivateRoute allowedRoles={['administrator']}>
                                            <AdminDashboard />
                                        </PrivateRoute>
                                    }
                                />
                                <Route
                                    path="/admin/users"
                                    element={
                                        <PrivateRoute allowedRoles={['administrator']}>
                                            <AdminUsers />
                                        </PrivateRoute>
                                    }
                                />
                                <Route
                                    path="/admin/businesses"
                                    element={
                                        <PrivateRoute allowedRoles={['administrator']}>
                                            <AdminBusinessesList />
                                        </PrivateRoute>
                                    }
                                />
                                <Route
                                    path="/admin/position-types"
                                    element={
                                        <PrivateRoute allowedRoles={['administrator']}>
                                            <AdminPositionTypes />
                                        </PrivateRoute>
                                    }
                                />
                                <Route
                                    path="/admin/qualifications"
                                    element={
                                        <PrivateRoute allowedRoles={['administrator']}>
                                            <QualificationReviews />
                                        </PrivateRoute>
                                    }
                                />
                                <Route
                                    path="/admin/system"
                                    element={
                                        <PrivateRoute allowedRoles={['administrator']}>
                                            <SystemConfig />
                                        </PrivateRoute>
                                    }
                                />
                            </Routes>
                                </div>
                            </div>
                            <ToastContainer />
                        </NegotiationProvider>
                    </SocketProvider>
                </AuthProvider>
            </BrowserRouter>
        </ErrorBoundary>
    );
}

export default App;
