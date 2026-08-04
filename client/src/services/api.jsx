import axios from 'axios';

const API = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
    withCredentials: true,  // Send HTTP-Only cookies with every request
    headers: { 'Content-Type': 'application/json' }
});

// The app relies on HTTP-only auth cookie for authentication.
// Keep withCredentials enabled so the backend can validate the current session.
API.interceptors.request.use(
    (config) => config,
    (error) => Promise.reject(error)
);

// Handle expired session globally - redirect to login only for protected routes
API.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('elms_token');
            localStorage.removeItem('elms_user');
            const publicPaths = ['/login', '/register', '/', '/about', '/contact', '/help', '/privacy', '/terms', '/cookies', '/courses', '/search', '/career-tracks', '/categories', '/leaderboard', '/payment/callback', '/payment/success', '/payment/failed'];
            const currentPath = window.location.pathname;
            const isPublic = publicPaths.some(p => currentPath === p || currentPath.startsWith('/courses/') || currentPath.startsWith('/instructors/') || currentPath.startsWith('/payment/'));
            if (!isPublic && currentPath !== '/login') {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

// ── Auth API Calls ─────────────────────────────────────────
export const authService = {
    register: (data) => API.post('/auth/register', data),
    login: (data) => API.post('/auth/login', data),
    logout: () => API.post('/auth/logout'),
    getMe: () => API.get('/auth/me'),
    socialLogin: (data) => API.post('/auth/social-login', data),
    forgotPassword: (data) => API.post('/auth/forgot-password', data),
    resetPassword: (data) => API.post('/auth/reset-password', data)
};

// ── Course API Calls ───────────────────────────────────────
export const courseService = {
    getAll: () => API.get('/courses'),
    getAdminAll: () => API.get('/courses/admin/all'),
    getById: (id) => API.get(`/courses/${id}`),
    create: (data) => API.post('/courses', data),
    update: (id, data) => API.put(`/courses/${id}`, data),
    delete: (id) => API.delete(`/courses/${id}`),
    submitForReview: (id) => API.patch(`/courses/${id}/submit`),
    approve: (id) => API.patch(`/courses/${id}/approve`),
    publishCourse: (id) => API.patch(`/courses/${id}/publish`),
    requestRevision: (id, message) => API.patch(`/courses/${id}/request-revision`, { message }),
    reject: (id, message) => API.patch(`/courses/${id}/reject`, { message }),
    restore: (id) => API.patch(`/courses/${id}/restore`),
    feature: (id, data) => API.patch(`/courses/${id}/feature`, data),
    sendFeedback: (id, message) => API.patch(`/courses/${id}/feedback`, { message }),
    assignInstructor: (id, instructorId) => API.patch(`/courses/${id}/assign-instructor`, { instructorId }),
    removeInstructor: (id) => API.patch(`/courses/${id}/remove-instructor`),
    changeCategory: (id, technicalCategory) => API.patch(`/courses/${id}/change-category`, { technicalCategory }),
    archive: (id) => API.patch(`/courses/${id}/archive`),
    unpublish: (id) => API.patch(`/courses/${id}/unpublish`),
    duplicate: (id) => API.post(`/courses/${id}/duplicate`),
    enroll: (id) => API.post(`/courses/${id}/enroll`),
    getInstructorCourses: () => API.get('/courses/instructor/mine'),
    getInstructorAnalytics: () => API.get('/courses/instructor/analytics'),
    getStudentEnrollments: () => API.get('/courses/student/enrolled'),
    toggleClearance: (enrollmentId) => API.patch(`/courses/enrollment/${enrollmentId}/clear`),
    streamVideo: (lessonId) => API.get(`/courses/lessons/${lessonId}/stream`)
};

// ── Quiz API Calls ─────────────────────────────────────────
export const quizService = {
    create: (data) => API.post('/quizzes', data),
    getByCourse: (courseId) => API.get(`/quizzes/course/${courseId}`),
    getById: (id) => API.get(`/quizzes/${id}`),
    update: (id, data) => API.put(`/quizzes/${id}`, data),
    delete: (id) => API.delete(`/quizzes/${id}`),
    getInstructorQuizzes: () => API.get('/quizzes/instructor/mine'),
    submitAttempt: (id, answers) => API.post(`/quizzes/${id}/attempt`, { answers }),
    getResults: (id) => API.get(`/quizzes/${id}/results`)
};

// ── User Management API Calls ──────────────────────
export const userService = {
    getAll: (params) => API.get('/users', { params }),
    getById: (id) => API.get(`/users/${id}`),
    createUser: (data) => API.post('/users', data),
    update: (id, data) => API.patch(`/users/${id}`, data),
    updateProfile: (data) => API.patch('/users/profile', data),
    getProfile: () => API.get('/auth/me'),
    resetPassword: (id, newPassword) => API.patch(`/users/${id}/reset-password`, { newPassword }),
    deactivate: (id) => API.delete(`/users/${id}`),
    updateInstructorProfile: (data) => API.put('/users/instructor/profile', data)
};

// ── Enrollment & Payment API Calls ─────────────────────────
export const enrollmentService = {
    getAll: (params) => API.get('/enrollments', { params }),
    uploadPaymentSlip: (enrollmentId, formData) => API.post(`/enrollments/${enrollmentId}/payment-slip`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    getMyStatus: () => API.get('/enrollments/my-status'),
    approvePayment: (enrollmentId) => API.patch(`/enrollments/${enrollmentId}/approve`),
    rejectPayment: (enrollmentId) => API.patch(`/enrollments/${enrollmentId}/reject`)
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

// ── Reports & Exports API Calls (Admin) ───────────────────
export const reportService = {
    export: (params) => API.get('/reports/export', { params, responseType: 'blob' })
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
    getAdminSummary: () => API.get('/notifications/admin/summary'),
    sendAdmin: (data) => API.post('/notifications/admin/send', data),
    markAsRead: (id) => API.patch(`/notifications/${id}/read`),
    markAllAsRead: () => API.patch('/notifications/read-all'),
    delete: (id) => API.delete(`/notifications/${id}`)
};

// Internal and external messaging APIs (merged)
export const messageService = {
    // comm-based conversation APIs (used by the in-app chat)
    createConversation: (data) => API.post('/comm/conversations', data),
    getMyConversations: () => API.get('/comm/conversations/my'),
    sendMessage: (conversationId, data) => API.post(`/comm/conversations/${conversationId}/messages`, data),
    getMessages: (conversationId) => API.get(`/comm/conversations/${conversationId}/messages`),
    // raw messages endpoints (alternate API surface)
    getConversations: () => API.get('/messages/conversations'),
    getMessagesRaw: (conversationId) => API.get(`/messages/conversations/${conversationId}`),
    sendMessageDirect: (data) => API.post('/messages', data),
    // announcements & notifications
    getAnnouncements: () => API.get('/comm/announcements'),
    createAnnouncement: (data) => API.post('/comm/announcements', data),
    getMyNotifications: () => API.get('/comm/notifications/my'),
    markNotificationRead: (id) => API.patch(`/comm/notifications/${id}/read`)
};

// ── Review API Calls ───────────────────────────────────────
export const reviewService = {
    getCourseReviews: (courseId) => API.get(`/reviews/course/${courseId}`),
    submit: (courseId, data) => API.post(`/reviews/${courseId}`, data),
    toggleLike: (reviewId) => API.post(`/reviews/like/${reviewId}`),
    report: (reviewId, data) => API.post(`/reviews/report/${reviewId}`, data),
    moderate: (reviewId, action) => API.post(`/reviews/moderate/${reviewId}`, { action }),
    myReviews: () => API.get('/reviews/my')
};

export const feedbackService = {
    submit: (courseId, data) => API.post(`/feedback/${courseId || ''}`, data),
    myFeedback: () => API.get('/feedback/my'),
    instructorFeedback: () => API.get('/feedback/instructor'),
    respond: (feedbackId, response) => API.post(`/feedback/respond/${feedbackId}`, { response })
};

export const issueService = {
    report: (courseId, data) => API.post(`/issues/${courseId || ''}`, data),
    myIssues: () => API.get('/issues/my'),
    update: (issueId, data) => API.post(`/issues/update/${issueId}`, data)
};

// ── Certificate API Calls ──────────────────────────────────
export const certificateService = {
    // issuance & admin
    generate: (courseId) => API.post('/certificates/generate', { courseId }),
    generateForAdmin: (data) => API.post('/certificates/admin/generate', data),
    reissue: (id, data) => API.post(`/certificates/${id}/reissue`, data),
    revoke: (id, reason) => API.patch(`/certificates/${id}/revoke`, { reason }),
    getAllAdmin: () => API.get('/certificates/admin/all'),
    // student-facing
    getMine: () => API.get('/certificates/mine'),
    myCertificates: () => API.get('/certificates/my'),
    getMyCertificates: () => API.get('/certificates/me'),
    issue: (courseId) => API.post(`/certificates/issue/${courseId}`),
    issueCertificate: (courseId) => API.post(`/certificates/course/${courseId}/issue`),
    checkEligibility: (courseId) => API.get(`/certificates/check/${courseId}`),
    // verification & download
    verify: (certNumber) => API.get(`/certificates/verify/${certNumber}`),
    verifyCertificate: (certNumber) => API.get(`/certificates/verify/${certNumber}`),
    verifyPublic: (certificateId) => API.get(`/certificates/verify/${certificateId}`),
    download: (id, opts = { responseType: 'blob' }) => API.get(`/certificates/${id}/download`, opts),
    downloadCertificate: (id) => API.get(`/certificates/${id}/download`, { responseType: 'blob' })
};

// ── Discussion API Calls ───────────────────────────────────
export const discussionService = {
    getByCourse: (courseId, query) => API.get(`/discussions/course/${courseId}`, { params: query }),
    create: (data) => API.post('/discussions', data),
    addReply: (id, body) => API.post(`/discussions/${id}/reply`, { body }),
    upvote: (id) => API.post(`/discussions/${id}/upvote`),
    markResolved: (id, isResolved) => API.patch(`/discussions/${id}/resolve`, { isResolved }),
    selectBestReply: (id, replyId) => API.patch(`/discussions/${id}/best-reply`, { replyId }),
    togglePin: (id) => API.patch(`/discussions/${id}/pin`),
    delete: (id) => API.delete(`/discussions/${id}`)
};

// ── Assignment API Calls ───────────────────────────────────
export const assignmentService = {
    create: (data) => API.post('/assignments', data),
    getByCourse: (courseId) => API.get(`/assignments/course/${courseId}`),
    update: (id, data) => API.put(`/assignments/${id}`, data),
    submit: (id, data) => API.post(`/assignments/${id}/submit`, data),
    getSubmissions: (id) => API.get(`/assignments/${id}/submissions`),
    gradeSubmission: (submissionId, data) => API.patch(`/assignments/submissions/${submissionId}/grade`, data),
    getMySubmissions: () => API.get('/assignments/submissions/my'),
    getMyAssignments: () => API.get('/assignments/my')
};

// ── Project API Calls ───────────────────────────────────
export const projectService = {
    create: (data) => API.post('/projects', data),
    update: (id, data) => API.put(`/projects/${id}`, data),
    getByCourse: (courseId) => API.get(`/projects/course/${courseId}`),
    getMyProjects: () => API.get('/projects/my'),
    getById: (id) => API.get(`/projects/${id}`),
    submitMultipart: (id, formData) => API.post(`/projects/${id}/submit-multipart`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
    createTeam: (data) => API.post('/projects/teams', data),
    joinTeam: (data) => API.post('/projects/teams/join', data),
    getSubmissionsForProject: (id) => API.get(`/projects/${id}/submissions`),
    getMySubmissions: () => API.get('/projects/submissions/my'),
    gradeSubmission: (submissionId, data) => API.patch(`/projects/submissions/${submissionId}/grade`, data)
};

// ── Leaderboard API Calls ──────────────────────────────────
export const leaderboardService = {
    getTop: () => API.get('/leaderboard')
};

// ── Live Sessions API Calls ────────────────────────────────
export const liveSessionService = {
    getCourseSessions: (courseId) => API.get(`/live-sessions/course/${courseId}`),
    createSession: (data) => API.post('/live-sessions', data),
    markAttendance: (id) => API.put(`/live-sessions/${id}/attendance`),
    createGoogleMeet: (data) => API.post('/live-sessions/google/create', data),
    deleteSession: (id) => API.delete(`/live-sessions/${id}`)
};

// ── Learning Progress & Content Tracking API Calls ────────────────────────────
export const learningProgressService = {
    getCourseProgress: (courseId) => API.get(`/learning-progress/course/${courseId}`),
    getResumeProgress: () => API.get('/learning-progress/resume'),
    saveLessonProgress: (courseId, lessonId, payload) => API.post(`/learning-progress/course/${courseId}/lesson/${lessonId}/progress`, payload),
    markDocumentViewed: (courseId, lessonId) => API.post(`/learning-progress/course/${courseId}/lesson/${lessonId}/document`, {}),
    trackResourceDownload: (courseId, lessonId, payload) => API.post(`/learning-progress/course/${courseId}/lesson/${lessonId}/resource`, payload)
};

// ── AI Tutor API Calls ─────────────────────────────────────
export const aiService = {
    askQuestion: (data) => API.post('/ai/ask', data),
    getHistory: () => API.get('/ai/history'),
    clearHistory: () => API.delete('/ai/history/clear'),
    generateLearningPath: (data) => API.post('/ai/learning-path', data),
    recommendCourses: (data) => API.post('/ai/recommend-courses', data),
    generateQuiz: (data) => API.post('/ai/generate-quiz', data),
    assignmentAssistant: (data) => API.post('/ai/assignment-assistant', data)
};

// ── Upload & Media API Calls (Phase 6) ─────────────────────
export const uploadService = {
    uploadFile: (formData) => API.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    })
};

// ── Payment Gateway API Calls (Phase 6) ────────────────────
export const paymentService = {
    create: (data) => API.post('/payments/create', data),
    initiate: (data) => API.post('/payments/initiate', data),
    verify: (txRef) => API.get(`/payments/verify/${txRef}`),
    verifyChapa: (txRef) => API.get(`/payments/chapa/verify/${txRef}`),
    history: () => API.get('/payments/history'),
    invoice: (id) => API.get(`/payments/invoice/${id}`),
    requestRefund: (data) => API.post('/payments/refund', data),
    applyCoupon: (data) => API.post('/payments/coupon', data)
};

// ── Audit Logs API Calls (Admin) ──────────────────────────
export const auditService = {
    getLogs: (params) => API.get('/audit-logs', { params }),
    getStats: () => API.get('/audit-logs/stats')
};

// ── System API Calls (Admin) ─────────────────────────────────
export const systemService = {
    getSettings: () => API.get('/system/settings'),
    updateSettings: (data) => API.put('/system/settings', data),
    createBackup: () => API.post('/system/backup'),
    restoreDatabase: (data) => API.post('/system/database/restore', data),
    optimizeDatabase: () => API.post('/system/database/optimize'),
    getDatabaseCollections: () => API.get('/system/database/collections'),
    getDatabaseStorage: () => API.get('/system/database/storage'),
    clearCache: () => API.post('/system/cache/clear')
};

// ── Content Management API Calls (Admin) ──────────────────
export const contentService = {
    getPage: (page) => API.get(`/content/${page}`),
    savePage: (page, data) => API.put(`/content/${page}`, data),
    getAll: () => API.get('/content')
};

// ── Calendar API Calls (Admin) ────────────────────────────
export const calendarService = {
    getEvents: (params) => API.get('/calendar', { params }),
    createEvent: (data) => API.post('/calendar', data),
    updateEvent: (id, data) => API.put(`/calendar/${id}`, data),
    deleteEvent: (id) => API.delete(`/calendar/${id}`)
};

// ── Newsletter API (Visitor) ────────────────────────────────
export const newsletterService = {
    // Stored locally as no backend endpoint exists yet
    subscribe: (email) => {
        const subscribers = JSON.parse(localStorage.getItem('newsletter_subscribers') || '[]');
        if (!subscribers.includes(email)) subscribers.push(email);
        localStorage.setItem('newsletter_subscribers', JSON.stringify(subscribers));
        return Promise.resolve({ success: true, email });
    }
};

// ── Public Instructor API (Visitor) ────────────────────────
export const publicInstructorService = {
    getAll: () => API.get('/users?role=Instructor').catch(() => ({ data: { data: [] } })),
    getById: (id) => API.get(`/users/${id}`)
};

export default API;
