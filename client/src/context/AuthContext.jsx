import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { authService } from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        // Hydrate immediately from localStorage — no network round-trip needed to render
        try {
            const saved = localStorage.getItem('elms_user');
            return saved ? JSON.parse(saved) : null;
        } catch { return null; }
    });
    // Start as FALSE — render immediately using localStorage data.
    // verifySession runs silently in the background to confirm the token is still valid.
    const [loading, setLoading] = useState(false);

    // On first mount, silently verify token with the server.
    // We do NOT block rendering — the user sees the page instantly.
    // If the token is invalid we redirect to login; if server is down we keep the cached user.
    useEffect(() => {
        const verifySession = async () => {
            const token = localStorage.getItem('elms_token');
            if (!token) return; // no token — nothing to verify, user stays null
            try {
                const { data } = await authService.getMe();
                setUser(data.data);
            } catch (err) {
                const status = err?.response?.status;
                if (status === 401) {
                    localStorage.removeItem('elms_token');
                    localStorage.removeItem('elms_user');
                    setUser(null);
                }
                // Network errors: keep the localStorage user intact
            }
        };
        verifySession();
    }, []);

    const login = useCallback(async (accountEmail, securedPassword) => {
        const normalizedEmail = accountEmail?.trim().toLowerCase();
        const { data } = await authService.login({ accountEmail: normalizedEmail, securedPassword });
        localStorage.setItem('elms_token', data.token);
        localStorage.setItem('elms_user', JSON.stringify(data.data));
        setUser(data.data);
        return data.data;
    }, []);

    const register = useCallback(async (formData) => {
        const { data } = await authService.register(formData);
        return data;
    }, []);

    const verifyEmail = useCallback(async (payload) => {
        const { data } = await authService.verifyEmail(payload);
        return data;
    }, []);

    const resendVerification = useCallback(async (payload) => {
        const { data } = await authService.resendVerification(payload);
        return data;
    }, []);

    const socialAuth = useCallback(async (providerData) => {
        const { data } = await authService.socialLogin(providerData);
        localStorage.setItem('elms_token', data.token);
        localStorage.setItem('elms_user', JSON.stringify(data.data));
        setUser(data.data);
        return data.data;
    }, []);

    const requestPasswordReset = useCallback(async (accountEmail) => {
        const { data } = await authService.forgotPassword({ accountEmail });
        return data;
    }, []);

    const resetPassword = useCallback(async (resetToken, newPassword) => {
        const { data } = await authService.resetPassword({ resetToken, newPassword });
        localStorage.setItem('elms_token', data.token);
        localStorage.setItem('elms_user', JSON.stringify(data.data));
        setUser(data.data);
        return data.data;
    }, []);

    const logout = useCallback(async () => {
        try { await authService.logout(); } catch {}
        localStorage.removeItem('elms_token');
        localStorage.removeItem('elms_user');
        setUser(null);
    }, []);

    const updateUser = useCallback((updates) => {
        setUser((prevUser) => {
            const updatedUser = { ...prevUser, ...updates };
            localStorage.setItem('elms_user', JSON.stringify(updatedUser));
            return updatedUser;
        });
    }, []);

    const value = {
        user,
        loading,
        login,
        register,
        verifyEmail,
        resendVerification,
        socialAuth,
        requestPasswordReset,
        resetPassword,
        logout,
        updateUser,
        isAuthenticated: !!user,
        isAdmin: user?.assignedRole === 'Admin',
        isInstructor: user?.assignedRole === 'Instructor',
        isStudent: user?.assignedRole === 'Student',
        isSuspended: user?.isSuspended || false,
        suspensionReason: user?.suspensionReason || '',
        suspensionEndDate: user?.suspensionEndDate || null,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
