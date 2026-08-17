import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

// ── Instant page-shell fallback (shows immediately, no white flash) ────────
const PageShell = () => (
    <div style={{
        minHeight: '100vh', background: '#0f172a',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
        <div style={{
            width: 36, height: 36, borderRadius: '50%',
            border: '3px solid rgba(99,102,241,0.25)',
            borderTopColor: '#6366f1',
            animation: 'spin 0.7s linear infinite'
        }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
);

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
                <div style={{ minHeight:'100vh', background:'#0f172a', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', color:'#fff', padding:24, fontFamily:'system-ui,sans-serif' }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
                    <h2 style={{ margin:'0 0 12px', fontSize:22 }}>Page failed to load</h2>
                    <p style={{ color:'#94a3b8', marginBottom:20, textAlign:'center' }}>A network error occurred loading this page.</p>
                    <button
                        onClick={() => window.location.reload()}
                        style={{ background:'#6366f1', color:'#fff', border:'none', borderRadius:10, padding:'12px 28px', fontSize:15, fontWeight:700, cursor:'pointer' }}
                    >
                        Reload Page
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

// ── Lazy-loaded pages (each gets its own JS chunk) ─────────────────────────
const LandingPage           = lazy(() => import('./pages/LandingPage'));
const LoginPage             = lazy(() => import('./pages/LoginPage'));
const RegisterPage          = lazy(() => import('./pages/RegisterPage'));
const ResetPasswordPage     = lazy(() => import('./pages/ResetPasswordPage'));
const VerifyEmailPage       = lazy(() => import('./pages/VerifyEmailPage'));
const AboutPage             = lazy(() => import('./pages/AboutPage'));
const ContactPage           = lazy(() => import('./pages/ContactPage'));
const HelpPage              = lazy(() => import('./pages/HelpPage'));
const PrivacyPage           = lazy(() => import('./pages/PrivacyPage'));
const TermsPage             = lazy(() => import('./pages/TermsPage'));
const CookiePage            = lazy(() => import('./pages/CookiePage'));
const DevelopersPage        = lazy(() => import('./pages/DevelopersPage'));

// Student pages
const StudentDashboard      = lazy(() => import('./pages/student/StudentDashboard'));
const LearningWorkspace     = lazy(() => import('./pages/student/LearningWorkspace'));
const CourseCatalog         = lazy(() => import('./pages/student/CourseCatalog'));
const CourseDetailPage      = lazy(() => import('./pages/student/CourseDetailPage'));
const QuizPage              = lazy(() => import('./pages/student/QuizPage'));
const PaymentPage           = lazy(() => import('./pages/student/PaymentPage'));
const WishlistPage          = lazy(() => import('./pages/student/WishlistPage'));
const CertificatesPage      = lazy(() => import('./pages/student/CertificatesPage'));
const ProfilePage           = lazy(() => import('./pages/student/ProfilePage'));
const LeaderboardPage       = lazy(() => import('./pages/student/LeaderboardPage'));
const DiscussionPage        = lazy(() => import('./pages/student/DiscussionPage'));
const AssignmentPage        = lazy(() => import('./pages/student/AssignmentPage'));
const MockCheckoutPage      = lazy(() => import('./pages/student/MockCheckoutPage'));
const Checkout              = lazy(() => import('./pages/student/Checkout'));
const PaymentCallbackPage   = lazy(() => import('./pages/student/PaymentCallbackPage'));
const PaymentSuccess        = lazy(() => import('./pages/student/PaymentSuccess'));
const PaymentFailed         = lazy(() => import('./pages/student/PaymentFailed'));

// Instructor pages
const InstructorDashboard   = lazy(() => import('./pages/instructor/InstructorDashboard'));
const InstructorSettings    = lazy(() => import('./pages/instructor/InstructorSettings'));
const AssignmentBuilder     = lazy(() => import('./pages/instructor/AssignmentBuilder'));
const CourseCreationWizard  = lazy(() => import('./pages/instructor/CourseCreationWizard'));
const QuizManagementDashboard = lazy(() => import('./pages/instructor/QuizManagementDashboard'));

// Admin pages
const AdminDashboard        = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminAuditLogs        = lazy(() => import('./pages/admin/AdminAuditLogs'));
const AdminUserProfilePage  = lazy(() => import('./pages/admin/AdminUserProfilePage'));
const AdminCoupons          = lazy(() => import('./pages/admin/Coupons'));
const CouponDetail          = lazy(() => import('./pages/admin/CouponDetail'));

// Shared pages
const VerifyCertificatePage = lazy(() => import('./pages/VerifyCertificatePage'));
const MessageInboxPage      = lazy(() => import('./pages/MessageInboxPage'));
const LiveSessionsPage      = lazy(() => import('./pages/LiveSessionsPage'));
const CategoriesPage        = lazy(() => import('./pages/CategoriesPage'));
const CareerTracksPage      = lazy(() => import('./pages/CareerTracksPage'));
const SearchPage            = lazy(() => import('./pages/SearchPage'));
const InstructorProfilePage = lazy(() => import('./pages/InstructorProfilePage'));

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
            <Suspense fallback={<PageShell />}>
            <Routes>
                {/* ── Public Routes ──────────────────────────────────── */}
                <Route path="/"                      element={<LandingPage />} />
                <Route path="/login"                 element={<LoginPage />} />
                <Route path="/register"              element={<RegisterPage />} />
                <Route path="/reset-password"        element={<ResetPasswordPage />} />
                <Route path="/verify-email"          element={<VerifyEmailPage />} />
                <Route path="/about"                 element={<AboutPage />} />
                <Route path="/developers"            element={<DevelopersPage />} />
                <Route path="/contact"               element={<ContactPage />} />
                <Route path="/help"                  element={<HelpPage />} />
                <Route path="/privacy"               element={<PrivacyPage />} />
                <Route path="/terms"                 element={<TermsPage />} />
                <Route path="/cookies"               element={<CookiePage />} />
                <Route path="/courses"               element={<CourseCatalog />} />
                <Route path="/courses/:courseId"     element={<CourseDetailPage />} />
                <Route path="/search"                element={<SearchPage />} />
                <Route path="/career-tracks"         element={<CareerTracksPage />} />
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
                <Route path="/student/wishlist"              element={<PrivateRoute allowedRoles={['Student']}><WishlistPage /></PrivateRoute>} />
                <Route path="/student/certificates"          element={<PrivateRoute allowedRoles={['Student']}><CertificatesPage /></PrivateRoute>} />
                <Route path="/student/profile"               element={<PrivateRoute allowedRoles={['Student']}><ProfilePage /></PrivateRoute>} />
                <Route path="/student/discussions"           element={<PrivateRoute allowedRoles={['Student']}><DiscussionPage /></PrivateRoute>} />
                <Route path="/student/discussions/:courseId" element={<PrivateRoute allowedRoles={['Student']}><DiscussionPage /></PrivateRoute>} />
                <Route path="/student/assignments/:courseId" element={<PrivateRoute allowedRoles={['Student']}><AssignmentPage /></PrivateRoute>} />
                <Route path="/checkout/:courseId"            element={<PrivateRoute allowedRoles={['Student']}><Checkout /></PrivateRoute>} />
                <Route path="/mock-checkout/:txRef"          element={<PrivateRoute allowedRoles={['Student']}><MockCheckoutPage /></PrivateRoute>} />
                <Route path="/payment/callback"              element={<PaymentCallbackPage />} />
                <Route path="/payment/success"               element={<PaymentSuccess />} />
                <Route path="/payment/failed"                element={<PaymentFailed />} />
                <Route path="/messages"                      element={<PrivateRoute><MessageInboxPage /></PrivateRoute>} />
                <Route path="/live-sessions"                 element={<PrivateRoute><LiveSessionsPage /></PrivateRoute>} />

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

                {/* ── Fallback ─────────────────────────────────────────── */}
                <Route path="/unauthorized" element={
                    <div style={{ color: '#fff', textAlign: 'center', padding: '80px', background: '#0f172a', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ fontSize: '64px', marginBottom: '20px' }}>🚫</div>
                        <h2 style={{ fontSize: '32px', margin: '0 0 12px' }}>403 — Access Denied</h2>
                        <p style={{ color: '#94a3b8', marginBottom: '24px' }}>You do not have permission to view this page.</p>
                        <a href="/" style={{ background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', color: '#fff', padding: '12px 24px', borderRadius: '10px', textDecoration: 'none', fontWeight: '700' }}>Go Home</a>
                    </div>
                } />
                <Route path="*" element={
                    <div style={{ color: '#fff', textAlign: 'center', padding: '80px', background: '#0f172a', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ fontSize: '64px', marginBottom: '20px' }}>🔍</div>
                        <h2 style={{ fontSize: '32px', margin: '0 0 12px' }}>404 — Page Not Found</h2>
                        <p style={{ color: '#94a3b8', marginBottom: '24px' }}>The page you're looking for doesn't exist.</p>
                        <a href="/" style={{ background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', color: '#fff', padding: '12px 24px', borderRadius: '10px', textDecoration: 'none', fontWeight: '700' }}>Go Home</a>
                    </div>
                } />
            </Routes>
        </Suspense>
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
