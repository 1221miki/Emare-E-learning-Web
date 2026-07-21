import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import HelpPage from './pages/HelpPage';
import PrivacyPage from './pages/PrivacyPage';
import TermsPage from './pages/TermsPage';
import CookiePage from './pages/CookiePage';
import StudentDashboard from './pages/student/StudentDashboard';
import InstructorDashboard from './pages/instructor/InstructorDashboard';
import AdminDashboard from './pages/admin/AdminDashboard';
import LearningWorkspace from './pages/student/LearningWorkspace';
import CourseCatalog from './pages/student/CourseCatalog';
import CourseDetailPage from './pages/student/CourseDetailPage';
import QuizPage from './pages/student/QuizPage';
import PaymentPage from './pages/student/PaymentPage';
import WishlistPage from './pages/student/WishlistPage';
import CertificatesPage from './pages/student/CertificatesPage';
import ProfilePage from './pages/student/ProfilePage';
import LeaderboardPage from './pages/student/LeaderboardPage';
import DiscussionPage from './pages/student/DiscussionPage';
import AssignmentPage from './pages/student/AssignmentPage';
import MessageInboxPage from './pages/MessageInboxPage';
import LiveSessionsPage from './pages/LiveSessionsPage';

// NEW: Visitor Public Pages
import CategoriesPage from './pages/CategoriesPage';
import SearchPage from './pages/SearchPage';
import InstructorProfilePage from './pages/InstructorProfilePage';

// ── Route Guard: Redirect unauthenticated users to login ──
const PrivateRoute = ({ children, allowedRoles }) => {
    const { isAuthenticated, user } = useAuth();
    if (!isAuthenticated) return <Navigate to="/login" replace />;
    if (allowedRoles && !allowedRoles.includes(user?.assignedRole)) return <Navigate to="/unauthorized" replace />;
    return children;
};

function AppRoutes() {
    return (
        <Routes>
            {/* ── Public / Visitor Routes ─────────────────────── */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/help" element={<HelpPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/cookies" element={<CookiePage />} />

            {/* Courses — public browsing */}
            <Route path="/courses" element={<CourseCatalog />} />
            <Route path="/courses/:courseId" element={<CourseDetailPage />} />

            {/* Search */}
            <Route path="/search" element={<SearchPage />} />

            {/* Categories */}
            <Route path="/categories" element={<CategoriesPage />} />

            {/* Instructors */}
            <Route path="/instructors/:id" element={<InstructorProfilePage />} />
            <Route path="/instructors" element={<SearchPage />} />

            {/* Leaderboard — public */}
            <Route path="/leaderboard" element={<LeaderboardPage />} />

            {/* ── Student Routes ──────────────────────────────── */}
            <Route path="/student/dashboard" element={<PrivateRoute allowedRoles={['Student']}><StudentDashboard /></PrivateRoute>} />
            <Route path="/student/learn/:courseId" element={<PrivateRoute allowedRoles={['Student']}><LearningWorkspace /></PrivateRoute>} />
            <Route path="/student/quiz/:quizId" element={<PrivateRoute allowedRoles={['Student']}><QuizPage /></PrivateRoute>} />
            <Route path="/student/payments" element={<PrivateRoute allowedRoles={['Student']}><PaymentPage /></PrivateRoute>} />
            <Route path="/student/wishlist" element={<PrivateRoute allowedRoles={['Student']}><WishlistPage /></PrivateRoute>} />
            <Route path="/student/certificates" element={<PrivateRoute allowedRoles={['Student']}><CertificatesPage /></PrivateRoute>} />
            <Route path="/student/profile" element={<PrivateRoute allowedRoles={['Student']}><ProfilePage /></PrivateRoute>} />
            <Route path="/student/discussions/:courseId" element={<PrivateRoute allowedRoles={['Student']}><DiscussionPage /></PrivateRoute>} />
            <Route path="/student/assignments/:courseId" element={<PrivateRoute allowedRoles={['Student']}><AssignmentPage /></PrivateRoute>} />
            <Route path="/messages" element={<PrivateRoute><MessageInboxPage /></PrivateRoute>} />
            <Route path="/live-sessions" element={<PrivateRoute><LiveSessionsPage /></PrivateRoute>} />

            {/* ── Instructor Routes ───────────────────────────── */}
            <Route path="/instructor/dashboard" element={<PrivateRoute allowedRoles={['Instructor']}><InstructorDashboard /></PrivateRoute>} />

            {/* ── Admin Routes ────────────────────────────────── */}
            <Route path="/admin/dashboard" element={<PrivateRoute allowedRoles={['Admin']}><AdminDashboard /></PrivateRoute>} />

            {/* ── Fallback ─────────────────────────────────────── */}
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
    );
}

export default function App() {
    return (
        <ThemeProvider>
            <AppRoutes />
        </ThemeProvider>
    );
}
