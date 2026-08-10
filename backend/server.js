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
const learningProgressRoutes = require('./routes/learningProgressRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const systemRoutes = require('./routes/systemRoutes');
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
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    'http://127.0.0.1:3002',
    'http://localhost:5176',
    'http://localhost:5177',
    'http://127.0.0.1:5176',
    'http://127.0.0.1:5177'
];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin) || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
            return callback(null, true);
        }
        callback(new Error(`CORS policy blocked origin: ${origin}`));
    },
    credentials: true                        // Allow cookies to be sent cross-origin
}));
app.use(cookieParser());                     // Parse HTTP-Only cookie tokens
// Preserve raw body for webhook signature verification
app.use(express.json({ verify: (req, res, buf) => { req.rawBody = buf; } }));
app.use(express.urlencoded({ extended: true, verify: (req, res, buf) => { req.rawBody = buf; } }));

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
app.use('/api/learning-progress', learningProgressRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/comm', communicationRoutes);
app.use('/api/analytics/overview', protect, authorizeRoles('Admin'), getAnalytics);

// ── Health Check ───────────────────────────────────────────
app.get('/api/health', (req, res) => {
    res.status(200).json({ success: true, message: 'Emare ELMS Backend is running.' });
});

// ── 404 Handler for API routes ──────────────────────────────
app.all('/api/*', (req, res) => {
    res.status(404).json({ success: false, message: `API Route ${req.originalUrl} not found on this server.` });
});

// ── Serve Frontend in Production ───────────────────────────
if (process.env.NODE_ENV === 'production') {
    // Serve static files from the React app build directory
    app.use(express.static(path.join(__dirname, '../client/build')));

    // The "catchall" handler: for any request that doesn't
    // match one above, send back React's index.html file.
    app.get('*', (req, res) => {
        res.sendFile(path.resolve(__dirname, '../client/build', 'index.html'));
    });
} else {
    app.get('/', (req, res) => {
        res.send('API is running in development mode. Please run the React client separately.');
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
