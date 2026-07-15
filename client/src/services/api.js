import axios from 'axios';

const API = axios.create({
    baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
    withCredentials: true,  // Send HTTP-Only cookies with every request
    headers: { 'Content-Type': 'application/json' }
});

// Attach JWT token from localStorage to every outgoing request
API.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('elms_token');
        if (token) config.headers.Authorization = `Bearer ${token}`;
        return config;
    },
    (error) => Promise.reject(error)
);

// Handle expired session globally - redirect to login
API.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('elms_token');
            localStorage.removeItem('elms_user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// ── Auth API Calls ─────────────────────────────────────────
export const authService = {
    register: (data) => API.post('/auth/register', data),
    login: (data) => API.post('/auth/login', data),
    logout: () => API.post('/auth/logout'),
    getMe: () => API.get('/auth/me')
};

// ── Course API Calls ───────────────────────────────────────
export const courseService = {
    getAll: () => API.get('/courses'),
    getById: (id) => API.get(`/courses/${id}`),
    create: (data) => API.post('/courses', data),
    update: (id, data) => API.put(`/courses/${id}`, data),
    submitForReview: (id) => API.patch(`/courses/${id}/submit`),
    approve: (id) => API.patch(`/courses/${id}/approve`),
    enroll: (id) => API.post(`/courses/${id}/enroll`),
    getInstructorCourses: () => API.get('/courses/instructor/mine'),
    getStudentEnrollments: () => API.get('/courses/student/enrolled'),
    toggleClearance: (enrollmentId) => API.patch(`/courses/enrollment/${enrollmentId}/clear`)
};

// ── Quiz API Calls ─────────────────────────────────────────
export const quizService = {
    create: (data) => API.post('/quizzes', data),
    getByCourse: (courseId) => API.get(`/quizzes/course/${courseId}`),
    getById: (id) => API.get(`/quizzes/${id}`),
    submitAttempt: (id, answers) => API.post(`/quizzes/${id}/attempt`, { answers }),
    getResults: (id) => API.get(`/quizzes/${id}/results`)
};

// ── User Management API Calls (Admin) ──────────────────────
export const userService = {
    getAll: (params) => API.get('/users', { params }),
    getById: (id) => API.get(`/users/${id}`),
    update: (id, data) => API.patch(`/users/${id}`, data),
    resetPassword: (id, newPassword) => API.patch(`/users/${id}/reset-password`, { newPassword }),
    deactivate: (id) => API.delete(`/users/${id}`)
};

// ── Enrollment & Payment API Calls ─────────────────────────
export const enrollmentService = {
    getAll: (params) => API.get('/enrollments', { params }),
    uploadPaymentSlip: (enrollmentId, formData) => API.post(`/enrollments/${enrollmentId}/payment-slip`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    getMyStatus: () => API.get('/enrollments/my-status')
};

// ── Gradebook & Submissions API Calls ──────────────────────
export const gradebookService = {
    submitAssignment: (data) => API.post('/submissions', data),
    getSubmissionsForCourse: (courseId) => API.get(`/submissions/course/${courseId}`),
    gradeSubmission: (id, data) => API.patch(`/submissions/${id}/grade`, data),
    getMyGrades: () => API.get('/grades/my-grades')
};

// ── Analytics API Calls (Admin) ────────────────────────────
export const analyticsService = {
    getOverview: () => API.get('/analytics/overview')
};

// ── Wishlist API Calls ─────────────────────────────────────
export const wishlistService = {
    getMyWishlist: () => API.get('/wishlist'),
    toggle: (courseId) => API.post('/wishlist/toggle', { courseId })
};

// ── Category API Calls ─────────────────────────────────────
export const categoryService = {
    getAll: () => API.get('/categories'),
    create: (data) => API.post('/categories', data),
    update: (id, data) => API.put(`/categories/${id}`, data),
    delete: (id) => API.delete(`/categories/${id}`)
};

// ── Notification API Calls ─────────────────────────────────
export const notificationService = {
    getAll: () => API.get('/notifications'),
    markAsRead: (id) => API.patch(`/notifications/${id}/read`),
    markAllAsRead: () => API.patch('/notifications/read-all'),
    delete: (id) => API.delete(`/notifications/${id}`)
};

// ── Review API Calls ───────────────────────────────────────
export const reviewService = {
    getCourseReviews: (courseId) => API.get(`/reviews/course/${courseId}`),
    create: (data) => API.post('/reviews', data),
    reply: (id, reply) => API.patch(`/reviews/${id}/reply`, { reply }),
    delete: (id) => API.delete(`/reviews/${id}`)
};

// ── Certificate API Calls ──────────────────────────────────
export const certificateService = {
    generate: (courseId) => API.post('/certificates/generate', { courseId }),
    getMine: () => API.get('/certificates/mine'),
    verify: (certNumber) => API.get(`/certificates/verify/${certNumber}`)
};

// ── Discussion API Calls ───────────────────────────────────
export const discussionService = {
    getByCourse: (courseId) => API.get(`/discussions/course/${courseId}`),
    create: (data) => API.post('/discussions', data),
    addReply: (id, body) => API.post(`/discussions/${id}/reply`, { body }),
    togglePin: (id) => API.patch(`/discussions/${id}/pin`),
    delete: (id) => API.delete(`/discussions/${id}`)
};

// ── Assignment API Calls ───────────────────────────────────
export const assignmentService = {
    create: (data) => API.post('/assignments', data),
    getByCourse: (courseId) => API.get(`/assignments/course/${courseId}`),
    submit: (id, data) => API.post(`/assignments/${id}/submit`, data),
    getSubmissions: (id) => API.get(`/assignments/${id}/submissions`),
    gradeSubmission: (submissionId, data) => API.patch(`/assignments/submissions/${submissionId}/grade`, data),
    getMySubmissions: () => API.get('/assignments/my-submissions')
};

// ── Leaderboard API Calls ──────────────────────────────────
export const leaderboardService = {
    getTop: () => API.get('/leaderboard')
};

// ── Messaging API Calls ────────────────────────────────────
export const messageService = {
    getConversations: () => API.get('/messages/conversations'),
    getMessages: (conversationId) => API.get(`/messages/conversations/${conversationId}`),
    sendMessage: (data) => API.post('/messages', data)
};

// ── Live Sessions API Calls ────────────────────────────────
export const liveSessionService = {
    getCourseSessions: (courseId) => API.get(`/live-sessions/course/${courseId}`),
    createSession: (data) => API.post('/live-sessions', data),
    deleteSession: (id) => API.delete(`/live-sessions/${id}`)
};

// ── AI Tutor API Calls ─────────────────────────────────────
export const aiService = {
    askQuestion: (data) => API.post('/ai/ask', data)
};

// ── Upload & Media API Calls (Phase 6) ─────────────────────
export const uploadService = {
    uploadFile: (formData) => API.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    })
};

// ── Payment Gateway API Calls (Phase 6) ────────────────────
export const paymentService = {
    initializePayment: (data) => API.post('/payments/initialize', data),
    verifyPayment: (tx_ref) => API.get(`/payments/verify/${tx_ref}`)
};

export default API;
