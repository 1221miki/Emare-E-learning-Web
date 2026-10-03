import { io } from 'socket.io-client';

const SOCKET_URL = (() => {
    const fromEnv = (import.meta.env.VITE_API_URL || '').trim();
    if (fromEnv) return fromEnv.replace('/api', '');
    if (import.meta.env.DEV) return '';
    if (window.location.hostname.endsWith('.netlify.app')) {
        return 'https://ayires.onrender.com';
    }
    return '';
})();

let socket = null;

export const initSocket = (token) => {
    if (socket?.connected) return socket;

    socket = io(SOCKET_URL, {
        withCredentials: true,
        transports: ['websocket', 'polling'],
        auth: { token }
    });

    socket.on('connect', () => {
        console.log('Socket connected:', socket.id);
        if (token) {
            socket.emit('authenticate', token);
        }
    });

    socket.on('authenticated', (data) => {
        if (data.success) {
            console.log('Socket authenticated:', data.userId);
        } else {
            console.warn('Socket authentication failed:', data.message);
        }
    });

    socket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
    });

    socket.on('connect_error', (err) => {
        console.error('Socket connection error:', err.message);
    });

    return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};

export const joinCourseRoom = (courseId) => {
    if (socket?.connected) {
        socket.emit('joinCourse', courseId);
    }
};

export const leaveCourseRoom = (courseId) => {
    if (socket?.connected) {
        socket.emit('leaveCourse', courseId);
    }
};

export const onLiveSessionCreated = (callback) => {
    if (socket) socket.on('liveSessionCreated', callback);
};

export const onLiveSessionUpdated = (callback) => {
    if (socket) socket.on('liveSessionUpdated', callback);
};

export const onLiveSessionDeleted = (callback) => {
    if (socket) socket.on('liveSessionDeleted', callback);
};

export const onLiveSessionStarted = (callback) => {
    if (socket) socket.on('liveSessionStarted', callback);
};

export const onLiveSessionEnded = (callback) => {
    if (socket) socket.on('liveSessionEnded', callback);
};

export const onRecordingPublished = (callback) => {
    if (socket) socket.on('recordingPublished', callback);
};

export const onRecordingUnpublished = (callback) => {
    if (socket) socket.on('recordingUnpublished', callback);
};

export const onRecordingDeleted = (callback) => {
    if (socket) socket.on('recordingDeleted', callback);
};

export const offLiveSessionCreated = (callback) => {
    if (socket) socket.off('liveSessionCreated', callback);
};

export const offLiveSessionUpdated = (callback) => {
    if (socket) socket.off('liveSessionUpdated', callback);
};

export const offLiveSessionDeleted = (callback) => {
    if (socket) socket.off('liveSessionDeleted', callback);
};

export const offLiveSessionStarted = (callback) => {
    if (socket) socket.off('liveSessionStarted', callback);
};

export const offLiveSessionEnded = (callback) => {
    if (socket) socket.off('liveSessionEnded', callback);
};

export const offRecordingPublished = (callback) => {
    if (socket) socket.off('recordingPublished', callback);
};

export const offRecordingUnpublished = (callback) => {
    if (socket) socket.off('recordingUnpublished', callback);
};

export const offRecordingDeleted = (callback) => {
    if (socket) socket.off('recordingDeleted', callback);
};

export const removeAllLiveSessionListeners = () => {
    if (socket) {
        socket.off('liveSessionCreated');
        socket.off('liveSessionUpdated');
        socket.off('liveSessionDeleted');
        socket.off('liveSessionStarted');
        socket.off('liveSessionEnded');
        socket.off('recordingPublished');
        socket.off('recordingUnpublished');
        socket.off('recordingDeleted');
    }
};