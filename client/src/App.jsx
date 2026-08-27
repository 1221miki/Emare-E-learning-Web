import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

// ── Chunk-load error boundary: retries once on network failure ─────────────
class ChunkErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, retried: false };
    }
    static getDerivedStateFromError() { return { hasError: true }; }
    componentDidCatch(err) {
        // Chunk failed to load (network issue) — reload once to retry
        if (!this.state.retried && err && err.message && (
            err.message.includes('Failed to fetch') ||
            err.message.includes('Load failed') ||
            err.message.includes('Loading chunk') ||
            err.message.includes('dynamically imported module')
        )) {
            this.setState({ retried: true, hasError: false });
            window.location.reload();
        }
    }
    render() {
        if (this.state.hasError) {
            return (
                <div style={{ minHeight:'100vh', background:'#f8fafc', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', color:'#0f172a', padding:24, fontFamily:'system-ui,sans-serif' }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
                    <h2 style={{ margin:'0 0 12px', fontSize:22 }}>Page failed to load</h2>
                    <p style={{ color:'#94a3b8', marginBottom:20, textAlign:'center' }}>A network error occurred loading this page.</p>
                    <button
                        onClick={() => window.location.reload()}
                        style={{ background:'#22c55e', color:'#fff', border:'none', borderRadius:10, padding:'12px 28px', fontSize:15, fontWeight:700, cursor:'pointer' }}
                    >
                        Reload Page
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

// ── Pages (static imports, so nothing lazy-loads and no spinner is shown) ──
import LandingPage           from './pages/LandingPage';
import LoginPage             from './pages/LoginPage';
import RegisterPage          from './pages/RegisterPage';
import ResetPasswordPage     from './pages/ResetPasswordPage';
import VerifyEmailPage       from './pages/VerifyEmailPage';
import AboutPage             from './pages/AboutPage';
import HelpPage              from './pages/HelpPage';
import PrivacyPage           from './pages/PrivacyPage';
import TermsPage             from './pages/TermsPage';
import CookiePage            from './pages/CookiePage';
import DevelopersPage        from './pages/DevelopersPage';

// Student pages
import StudentDashboard      from './pages/student/StudentDashboard';
import LearningWorkspace     from './pages/student/LearningWorkspace';
import CourseCatalog         from './pages/student/CourseCatalog';
import CourseDetailPage      from './pages/student/CourseDetailPage';
import QuizPage              from './pages/student/QuizPage';
import PaymentPage           from './pages/student/PaymentPage';
import CertificatesPage      from './pages/student/CertificatesPage';
import ProfilePage           from './pages/student/ProfilePage';
import LeaderboardPage       from './pages/student/LeaderboardPage';
import DiscussionPage        from './pages/student/DiscussionPage';
import AssignmentPage        from './pages/student/AssignmentPage';
import MockCheckoutPage      from './pages/student/MockCheckoutPage';
import Checkout              from './pages/student/Checkout';
import PaymentCallbackPage   from './pages/student/PaymentCallbackPage';
import PaymentSuccess        from './pages/student/PaymentSuccess';
import PaymentFailed         from './pages/student/PaymentFailed';

// Instructor pages
import InstructorDashboard   from './pages/instructor/InstructorDashboard';
import InstructorSettings    from './pages/instructor/InstructorSettings';
import AssignmentBuilder     from './pages/instructor/AssignmentBuilder';
import CourseCreationWizard  from './pages/instructor/CourseCreationWizard';
import QuizManagementDashboard from './pages/instructor/QuizManagementDashboard';

// Admin pages
import AdminDashboard        from './pages/admin/AdminDashboard';
import AdminAuditLogs        from './pages/admin/AdminAuditLogs';
import AdminUserProfilePage  from './pages/admin/AdminUserProfilePage';
import AdminCoupons          from './pages/admin/Coupons';
import CouponDetail          from './pages/admin/CouponDetail';
import AdminEventsPage       from './pages/admin/AdminEventsPage';
import AdminDevelopers       from './pages/AdminDevelopers';
import AdminContactMessages  from './pages/admin/AdminContactMessages';
import SupportMessagesPage   from './pages/SupportMessagesPage';

// Shared pages
import VerifyCertificatePage from './pages/VerifyCertificatePage';
import MessageInboxPage      from './pages/MessageInboxPage';
import LiveSessionsPage      from './pages/LiveSessionsPage';
import EventsPage            from './pages/EventsPage';
import EventDetailPage       from './pages/EventDetailPage';
import CategoriesPage        from './pages/CategoriesPage';
import SearchPage            from './pages/SearchPage';
import InstructorProfilePage from './pages/InstructorProfilePage';

// ── Route Guard ────────────────────────────────────────────────────────────
const PrivateRoute = ({ children, allowedRoles }) => {
    const { isAuthenticated, user } = useAuth();
    if (!isAuthenticated) return <Navigate to="/login" replace />;
    if (allowedRoles && !allowedRoles.includes(user?.assignedRole)) return <Navigate to="/unauthorized" replace />;
    return children;
};

function AppRoutes() {
    return (
        <ChunkErrorBoundary>
            <Routes>
                {/* ── Public Routes ──────────────────────────────────── */}
                <Route path="/"                      element={<LandingPage />} />
                <Route path="/login"                 element={<LoginPage />} />
                <Route path="/register"              element={<RegisterPage />} />
                <Route path="/reset-password"        element={<ResetPasswordPage />} />
                <Route path="/verify-email"          element={<VerifyEmailPage />} />
                <Route path="/about"                 element={<AboutPage />} />
                <Route path="/developers"            element={<DevelopersPage />} />
                <Route path="/contact"               element={<Navigate to="/#contact" replace />} />
                <Route path="/help"                  element={<HelpPage />} />
                <Route path="/privacy"               element={<PrivacyPage />} />
                <Route path="/terms"                 element={<TermsPage />} />
                <Route path="/cookies"               element={<CookiePage />} />
                <Route path="/courses"               element={<CourseCatalog />} />
                <Route path="/courses/:courseId"     element={<CourseDetailPage />} />
                <Route path="/search"                element={<SearchPage />} />
                <Route path="/categories"            element={<CategoriesPage />} />
                <Route path="/instructors/:id"       element={<InstructorProfilePage />} />
                <Route path="/instructors"           element={<SearchPage />} />
                <Route path="/leaderboard"           element={<LeaderboardPage />} />
                <Route path="/verify-certificate"           element={<VerifyCertificatePage />} />
                <Route path="/verify-certificate/:certificateId" element={<VerifyCertificatePage />} />

                {/* ── Student Routes ──────────────────────────────────── */}
                <Route path="/student/dashboard"             element={<PrivateRoute allowedRoles={['Student']}><StudentDashboard /></PrivateRoute>} />
                <Route path="/student/learn"                 element={<Navigate to="/student/dashboard" replace />} />
                <Route path="/student/learn/:courseId"       element={<PrivateRoute allowedRoles={['Student']}><LearningWorkspace /></PrivateRoute>} />
                <Route path="/student/quiz/:quizId"          element={<PrivateRoute allowedRoles={['Student']}><QuizPage /></PrivateRoute>} />
                <Route path="/student/payments"              element={<PrivateRoute allowedRoles={['Student']}><PaymentPage /></PrivateRoute>} />
                <Route path="/student/certificates"          element={<PrivateRoute allowedRoles={['Student']}><CertificatesPage /></PrivateRoute>} />
                <Route path="/student/profile"               element={<PrivateRoute allowedRoles={['Student']}><ProfilePage /></PrivateRoute>} />
                <Route path="/student/discussions"           element={<PrivateRoute allowedRoles={['Student']}><DiscussionPage /></PrivateRoute>} />
                <Route path="/student/discussions/:courseId" element={<PrivateRoute allowedRoles={['Student']}><DiscussionPage /></PrivateRoute>} />
                <Route path="/student/assignments/:courseId" element={<PrivateRoute allowedRoles={['Student']}><AssignmentPage /></PrivateRoute>} />
                <Route path="/checkout/:courseId"            element={<PrivateRoute allowedRoles={['Student']}><Checkout /></PrivateRoute>} />
                <Route path="/mock-checkout/:txRef"          element={<MockCheckoutPage />} />
                <Route path="/payment/callback"              element={<PaymentCallbackPage />} />
                <Route path="/payment/success"               element={<PaymentSuccess />} />
                <Route path="/payment/failed"                element={<PaymentFailed />} />
                <Route path="/messages"                      element={<PrivateRoute><MessageInboxPage /></PrivateRoute>} />
                <Route path="/support-messages"              element={<PrivateRoute><SupportMessagesPage /></PrivateRoute>} />
                <Route path="/live-sessions"                 element={<PrivateRoute><LiveSessionsPage /></PrivateRoute>} />
                <Route path="/events"                        element={<EventsPage />} />
                <Route path="/events/:eventId"               element={<EventDetailPage />} />

                {/* ── Instructor Routes ───────────────────────────────── */}
                <Route path="/instructor/dashboard"          element={<PrivateRoute allowedRoles={['Instructor']}><InstructorDashboard /></PrivateRoute>} />
                <Route path="/instructor/quizzes"            element={<PrivateRoute allowedRoles={['Instructor']}><QuizManagementDashboard /></PrivateRoute>} />
                <Route path="/instructor/settings"           element={<PrivateRoute allowedRoles={['Instructor']}><InstructorSettings /></PrivateRoute>} />
                <Route path="/instructor/courses/new"        element={<PrivateRoute allowedRoles={['Instructor']}><CourseCreationWizard /></PrivateRoute>} />
                <Route path="/instructor/assignments/new"    element={<PrivateRoute allowedRoles={['Instructor']}><AssignmentBuilder /></PrivateRoute>} />

                {/* ── Admin Routes ─────────────────────────────────────── */}
                <Route path="/admin/dashboard"               element={<PrivateRoute allowedRoles={['Admin']}><AdminDashboard /></PrivateRoute>} />
                <Route path="/admin/users/:id"               element={<PrivateRoute allowedRoles={['Admin']}><AdminUserProfilePage /></PrivateRoute>} />
                <Route path="/admin/audit-logs"              element={<PrivateRoute allowedRoles={['Admin']}><AdminAuditLogs /></PrivateRoute>} />
                <Route path="/admin/coupons"                 element={<PrivateRoute allowedRoles={['Admin']}><AdminCoupons /></PrivateRoute>} />
                <Route path="/admin/coupons/:id"             element={<PrivateRoute allowedRoles={['Admin']}><CouponDetail /></PrivateRoute>} />
                <Route path="/admin/events"                  element={<PrivateRoute allowedRoles={['Admin']}><AdminEventsPage /></PrivateRoute>} />
                <Route path="/admin/developers"              element={<PrivateRoute allowedRoles={['Admin']}><AdminDevelopers /></PrivateRoute>} />
                <Route path="/admin/contact-messages"        element={<PrivateRoute allowedRoles={['Admin']}><AdminContactMessages /></PrivateRoute>} />

                {/* ── Fallback ─────────────────────────────────────────── */}
                <Route path="/unauthorized" element={
                    <div style={{ color: '#0f172a', textAlign: 'center', padding: '80px', background: '#f8fafc', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ fontSize: '64px', marginBottom: '20px' }}>🚫</div>
                        <h2 style={{ fontSize: '32px', margin: '0 0 12px' }}>403 — Access Denied</h2>
                        <p style={{ color: '#64748b', marginBottom: '24px' }}>You do not have permission to view this page.</p>
                        <a href="/" style={{ background: 'linear-gradient(135deg,#22c55e,#22c55e)', color: '#fff', padding: '12px 24px', borderRadius: '10px', textDecoration: 'none', fontWeight: '700' }}>Go Home</a>
                    </div>
                } />
                <Route path="*" element={
                    <div style={{ color: '#0f172a', textAlign: 'center', padding: '80px', background: '#f8fafc', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ fontSize: '64px', marginBottom: '20px' }}>🔍</div>
                        <h2 style={{ fontSize: '32px', margin: '0 0 12px' }}>404 — Page Not Found</h2>
                        <p style={{ color: '#64748b', marginBottom: '24px' }}>The page you're looking for doesn't exist.</p>
                        <a href="/" style={{ background: 'linear-gradient(135deg,#22c55e,#22c55e)', color: '#fff', padding: '12px 24px', borderRadius: '10px', textDecoration: 'none', fontWeight: '700' }}>Go Home</a>
                    </div>
                } />
            </Routes>
        </ChunkErrorBoundary>
    );
}

export default function App() {
    return (
        <ThemeProvider>
            <AppRoutes />
        </ThemeProvider>
    );
}
