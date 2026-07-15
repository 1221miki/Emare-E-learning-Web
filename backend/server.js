require('dotenv').config({ path: '../.env' });
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
const leaderboardRoutes = require('./routes/leaderboardRoutes');
const messageRoutes = require('./routes/messageRoutes');
const liveSessionRoutes = require('./routes/liveSessionRoutes');
const aiRoutes = require('./routes/aiRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const systemRoutes = require('./routes/systemRoutes');
const { getAnalytics } = require('./controllers/userController');
const { protect, authorizeRoles } = require('./middleware/auth');

// Initialize Express App
const app = express();

// ── Core Middleware ────────────────────────────────────────
app.use(helmet());                           // Set secure HTTP response headers
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true                        // Allow cookies to be sent cross-origin
}));
app.use(cookieParser());                     // Parse HTTP-Only cookie tokens
app.use(express.json());                     // Parse incoming JSON request bodies
app.use(express.urlencoded({ extended: true }));

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
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/live-sessions', liveSessionRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/system', systemRoutes);
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
app.listen(PORT, () => {
    console.log(`✅ Server running in [${process.env.NODE_ENV || 'development'}] mode on port ${PORT}`);
});
