require('dotenv').config({ path: require('path').join(__dirname, '.env'), override: true });
// Ensure critical runtime files exist to prevent startup crashes from accidental deletions
try { require('./utils/ensureFiles'); } catch (err) { console.warn('ensureFiles initialization failed:', err && err.message); }

// Global process-level error logging.
// Without these, async failures never passed to next(err) become "unhandled" and
// Express replies with a raw HTML 500 — which the React client can't read as JSON.
process.on('unhandledRejection', (reason) => {
    console.error('❌ UNHANDLED PROMISE REJECTION (likely cause of silent 500s):');
    console.error(reason instanceof Error ? reason.stack : reason);
});
process.on('uncaughtException', (err) => {
    console.error('❌ UNCAUGHT EXCEPTION:', err);
});

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
const eventRoutes = require('./routes/eventRoutes');
const publicEventRoutes = require('./routes/publicEventRoutes');
const { getAnalytics } = require('./controllers/userController');
const { protect, authorizeRoles } = require('./middleware/auth');

// Initialize Express App
const app = express();

// ── Core Middleware ────────────────────────────────────────
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));                           // Set secure HTTP response headers
const allowedOrigins = [
    // Production frontend (Netlify)
    'https://resplendent-profiterole-2ed049.netlify.app',
    'https://6a82a9a-resplendent-profiterole-2ed049.netlify.app',
    // Backend on Render
    'https://ayires.onrender.com',
    'https://asamenew.onrender.com',
    // Local development
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

// Helper to match dynamic origins (Netlify preview deploys, localhost, LAN IPs)
const isAllowedOrigin = (origin) =>
    !origin ||                                                   // Server-to-server / curl, no Origin header
    allowedOrigins.includes(origin) ||
    origin.endsWith('.netlify.app') ||                           // All Netlify deploys & previews
    origin.endsWith('.onrender.com') ||                          // All Render previews
    /^http:\/\/(localhost|127\.0\.0\.1|10\.|192\.168\.)(:\d+)?$/.test(origin);

app.use(cors({
    origin: (origin, callback) => {
        if (isAllowedOrigin(origin)) {
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
connectDB()
    .catch(err => {
        console.error('❌ Fatal database initialization error:', err);
        process.exit(1);
    });

// ── API Routes ─────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/users', userRoutes);
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/submissions', gradebookRoutes);
app.use('/api/grades', gradebookRoutes);
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
app.use('/api/events', publicEventRoutes);
app.use('/api/admin/events', protect, authorizeRoles('Admin'), eventRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/analytics/overview', protect, authorizeRoles('Admin'), getAnalytics);
app.use('/api/admin/coupons', protect, authorizeRoles('Admin'), adminCouponRoutes);

// ── Health Check ───────────────────────────────────────────
app.get('/api/health', (req, res) => {
    res.status(200).json({ success: true, message: 'Emare ELMS Backend is running.' });
});

// ── 404 Handler for unknown API routes ─────────────────────
// CRITICAL: Must be BEFORE the SPA catch-all to prevent API 404s 
// from serving index.html (which would break React Router initialization)
app.all('/api/*', (req, res) => {
    res.status(404).json({ 
        success: false, 
        message: `API Route ${req.originalUrl} not found on this server.`,
        method: req.method,
        path: req.path
    });
});

// ── Serve Frontend in Production (SPA catch-all) ────────────────────────────
// CRITICAL: This MUST be AFTER /api/* routes so API 404s work correctly.
// Every non-/api/* GET/POST/etc. request returns index.html so React Router 
// can handle client-side navigation on refresh, reload, and direct URLs.
//
// Examples of what works on refresh with this setup:
//   GET /courses     → index.html → React Router renders Course page
//   GET /dashboard   → index.html → React Router renders Dashboard
//   GET /login       → index.html → React Router renders Login form
//   POST /api/auth   → backend API handles it normally
//   GET /api/courses → backend API handles it normally
//   GET /api/xyz     → 404 JSON from API handler above
//
if (process.env.NODE_ENV === 'production') {
    const fs = require('fs');

    // Search for client/dist in all plausible Render deployment locations
    const __server = __dirname;  // backend/ directory
    const __root   = path.resolve(__server, '..');  // repo root
    const __cwd    = process.cwd();

    const candidates = [
        path.join(__root,   'client/dist'),
        path.join(__cwd,    'client/dist'),
        path.join(__server, '../client/dist'),
        path.join(__server, 'client/dist'),
        path.resolve('/app/client/dist'),
        path.resolve('/opt/render/project/src/client/dist'),
    ];

    let staticDir = null;
    console.log('\n🔍 Searching for built React SPA (client/dist)...');
    for (const p of candidates) {
        const indexPath = path.join(p, 'index.html');
        try {
            if (fs.existsSync(p) && fs.existsSync(indexPath)) {
                staticDir = p;
                console.log(`✅ FOUND React SPA at: ${staticDir}\n`);
                break;
            }
        } catch (err) { 
            // ignore errors, just skip this path
        }
    }

    if (staticDir) {
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // SERVE STATIC ASSETS
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        
        // 1. Hashed assets (JS/CSS with content hashes) — cache for 1 year
        //    These filenames never change for the same content, so it's safe.
        app.use('/assets', express.static(path.join(staticDir, 'assets'), {
            maxAge: '1y',
            immutable: true,
            etag: false  // Hashed names + immutable is enough
        }));

        // 2. Everything else in dist (favicon.ico, manifest.json, images, fonts, etc.)
        //    Served without caching to catch updates quickly
        app.use(express.static(staticDir, { 
            index: false,  // Don't automatically serve index.html for dirs
            etag: false    // Let browser decide with Last-Modified
        }));

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // SPA CATCH-ALL — Handles client-side routing
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        
        // This middleware catches ALL non-/api/* requests and serves index.html.
        // React Router on the client then determines which page to render based on URL.
        // 
        // Use app.use('*', ...) not app.get('*', ...) to catch all HTTP methods,
        // though typically only GET requests would reach here (POST/PUT to /api/* 
        // are caught by API routes above).
        //
        // Critical: Only respond to non-API, non-static requests. Static assets
        // are already served above by express.static before this middleware runs.
        app.use('*', (req, res) => {
            const indexPath = path.resolve(staticDir, 'index.html');
            
            // Verify index.html still exists before serving
            if (!fs.existsSync(indexPath)) {
                console.error(`❌ index.html missing at: ${indexPath}`);
                res.status(500).send('Internal Server Error: Missing index.html');
                return;
            }
            
            // Serve index.html for SPA routing
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.sendFile(indexPath);
        });

        console.log('✅ SPA routing configured:');
        console.log('   /api/*        → backend API (protected)');
        console.log('   /assets/*     → hashed assets (1 year cache)');
        console.log('   /other-static → static files (no cache)');
        console.log('   /* (other)    → index.html (SPA routing)\n');

    } else {
        // Frontend is hosted separately (e.g., Netlify), so client/dist isn't
        // built on this server. The backend keeps running and serves ONLY the API —
        // static file serving and the SPA catch-all are skipped.
        console.warn('\n⚠️  client/dist not found — skipping SPA static serving.');
        console.warn('   The frontend is expected to be hosted separately (e.g., Netlify).');
        console.warn('   This backend will serve API endpoints only.\n');

        // Root endpoint confirms the API is alive (no SPA to serve).
        app.get('/', (_req, res) => {
            res.send('API Server is running...');
        });
    }
} else {
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // DEVELOPMENT MODE
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // In development, Vite dev server runs separately on port 5173
    // Backend only serves API routes
    app.get('/', (_req, res) => {
        res.send('ℹ️  API is running in development mode.\n\nTo start the React client:\n  cd client && npm run dev\n\nClient will run on http://localhost:5173\nAPI on http://localhost:5000');
    });
}

// ── Global Error Handler (must be last) ───────────────────
app.use(errorHandler);

// ── Start Server ───────────────────────────────────────────
const PORT = process.env.PORT || 5000;
// Bind to IPv6 dual-stack ('::') so BOTH IPv6 (::1) and IPv4 (127.0.0.1) clients connect.
// Fixes "connection refused" when a client resolves localhost to ::1 while the server
// only listened on 0.0.0.0 (IPv4) — which surfaced as an unreadable 500 in the React app.
app.listen(PORT, '::', () => {
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
