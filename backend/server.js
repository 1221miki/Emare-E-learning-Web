require('dotenv').config({ path: require('path').join(__dirname, '.env'), override: true });
// Ensure critical runtime files exist to prevent startup crashes from accidental deletions
try { require('./utils/ensureFiles'); } catch (err) { console.warn('ensureFiles initialization failed:', err && err.message); }
const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');
const { errorHandler } = require('./middleware/errorHandler');

// Route Imports
const authRoutes = require('./routes/authRoutes');
const courseRoutes = require('./routes/courseRoutes');
const quizRoutes = require('./routes/quizRoutes');
const userRoutes = require('./routes/userRoutes');
const enrollmentRoutes = require('./routes/enrollmentRoutes');
const gradebookRoutes = require('./routes/gradebookRoutes');
const wishlistRoutes = require('./routes/wishlistRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const certificateRoutes = require('./routes/certificateRoutes');
const discussionRoutes = require('./routes/discussionRoutes');
const assignmentRoutes = require('./routes/assignmentRoutes');
const projectRoutes = require('./routes/projectRoutes');
const leaderboardRoutes = require('./routes/leaderboardRoutes');
const messageRoutes = require('./routes/messageRoutes');
const liveSessionRoutes = require('./routes/liveSessionRoutes');
const aiRoutes = require('./routes/aiRoutes');
const aiHistoryRoutes = require('./routes/aiHistoryRoutes');
const socraticRoutes = require('./routes/socraticRoutes');
const learningProgressRoutes = require('./routes/learningProgressRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const pdfProxyRoutes = require('./routes/pdfProxyRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const systemRoutes = require('./routes/systemRoutes');
const adminCouponRoutes = require('./routes/adminCouponRoutes');
const couponRoutes = require('./routes/couponRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const reportRoutes = require('./routes/reportRoutes');
const contentRoutes = require('./routes/contentRoutes');
const auditRoutes = require('./routes/auditRoutes');
const calendarRoutes = require('./routes/calendarRoutes');
const communicationRoutes = require('./routes/communicationRoutes');
const mediaRoutes = require('./routes/mediaRoutes');
const { getAnalytics } = require('./controllers/userController');
const { protect, authorizeRoles } = require('./middleware/auth');

// Initialize Express App
const app = express();

// ── Core Middleware ────────────────────────────────────────
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));                           // Set secure HTTP response headers
const allowedOrigins = [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'https://ayires.onrender.com',        // Render production (current)
    'https://asamenew.onrender.com',      // Render production (previous)
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    'http://127.0.0.1:3002',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:5176',
    'http://localhost:5177',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5176',
    'http://127.0.0.1:5177',
    'http://10.18.56.22:5173',
    'http://10.18.56.22:5000',
    'http://192.168.137.1:5173',
    'http://192.168.137.1:5000'
];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin) || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:') || origin.startsWith('http://10.') || origin.startsWith('http://192.168.') || origin.endsWith('.onrender.com')) {
            return callback(null, true);
        }
        callback(new Error(`CORS policy blocked origin: ${origin}`));
    },
    credentials: true                        // Allow cookies to be sent cross-origin
}));
app.use(cookieParser());                     // Parse HTTP-Only cookie tokens
// Preserve raw body for webhook signature verification
app.use(express.json({
    limit: '2gb',
    verify: (req, res, buf) => { req.rawBody = buf; }
}));
app.use(express.urlencoded({
    extended: true,
    limit: '2gb',
    verify: (req, res, buf) => { req.rawBody = buf; }
}));

// Serve static uploaded files locally
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
app.use('/certificates', express.static(path.join(__dirname, 'public/certificates')));

// ── Connect to MongoDB Atlas ───────────────────────────────
connectDB();

// ── API Routes ─────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/users', userRoutes);
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/submissions', gradebookRoutes);
app.use('/api/grades', gradebookRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/discussions', discussionRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/live-sessions', liveSessionRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/ai/history', aiHistoryRoutes);
app.use('/api/socratic', socraticRoutes);
app.use('/api/learning-progress', learningProgressRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/pdf-proxy', pdfProxyRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/comm', communicationRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/analytics/overview', protect, authorizeRoles('Admin'), getAnalytics);
app.use('/api/admin/coupons', protect, authorizeRoles('Admin'), adminCouponRoutes);

// ── Health Check ───────────────────────────────────────────
app.get('/api/health', (req, res) => {
    res.status(200).json({ success: true, message: 'Emare ELMS Backend is running.' });
});

// ── 404 Handler for API routes ──────────────────────────────
// This MUST be before the SPA catch-all so unknown /api/* routes get a JSON 404
// instead of index.html.
app.all('/api/*', (req, res) => {
    res.status(404).json({ success: false, message: `API Route ${req.originalUrl} not found on this server.` });
});

// ── Serve Frontend in Production (SPA catch-all) ────────────
// In production the Express server serves the Vite-built React SPA AND
// acts as the API server.  Every non-/api/* GET request must return
// index.html so that React Router handles client-side navigation.
//
// This fixes the "404 on browser refresh" problem:
//   GET /login   → index.html  → React Router renders <LoginPage>
//   GET /register → index.html → React Router renders <RegisterPage>
//   etc.
//
// Static assets (JS/CSS/images) are served first by express.static and
// never reach the catch-all.
if (process.env.NODE_ENV === 'production') {
    const fs = require('fs');

    // Resolve the dist directory relative to this file (backend/server.js).
    // Works whether rootDir is "backend" or the repo root.
    const viteDist = path.join(__dirname, '../client/dist');
    const altDist  = path.join(__dirname, 'client/dist'); // fallback if layout differs

    const staticDir = fs.existsSync(viteDist) ? viteDist
                    : fs.existsSync(altDist)   ? altDist
                    : null;

    if (staticDir) {
        // Serve hashed JS/CSS/image assets with long-lived cache headers
        app.use('/assets', express.static(path.join(staticDir, 'assets'), {
            maxAge: '1y',
            immutable: true
        }));

        // Serve everything else in dist (favicon, manifest, etc.) without caching
        app.use(express.static(staticDir, { index: false }));

        // SPA catch-all — MUST be last, after all /api/* routes
        // Handles: browser refresh, direct URL entry, Back/Forward navigation
        app.get('*', (req, res) => {
            res.sendFile(path.resolve(staticDir, 'index.html'));
        });

        console.log(`✅ Serving React SPA from: ${staticDir}`);
    } else {
        // Dist not built yet — still register a catch-all so Render doesn't
        // show its own nginx 404 page. Client will see a plain text message.
        console.warn('⚠️  Production build not found — run: cd client && npm run build');
        app.get('*', (req, res) => {
            if (req.originalUrl.startsWith('/api/')) {
                res.status(404).json({ success: false, message: 'API route not found.' });
            } else {
                res.status(503).send('Application build not found. Please contact the administrator.');
            }
        });
    }
} else {
    // Development: frontend is served by Vite dev server on port 5173.
    app.get('/', (req, res) => {
        res.send('API is running in development mode. Run the React client separately (npm run dev in /client).');
    });
}

// ── Global Error Handler (must be last) ───────────────────
app.use(errorHandler);

// ── Start Server ───────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
    const ENV = (process.env.NODE_ENV || 'development').toUpperCase();
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║          🎓  Emare E-Learning LMS BACKEND 🎓             ║
║                                                           ║
║   Environment: ${ENV}                                      ║
║   Server running on: http://localhost:${PORT}              ║
║   API Base: http://localhost:${PORT}/api                   ║
║   Socket.IO: ✅ ENABLED                                     ║
║                                                           ║
║   Status: ✅ READY                                         ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
`);
});
