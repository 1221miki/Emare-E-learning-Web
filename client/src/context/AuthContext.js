import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { authService } from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        const saved = localStorage.getItem('elms_user');
        return saved ? JSON.parse(saved) : null;
    });
    const [loading, setLoading] = useState(true);

    // On first mount, verify token is still valid with the server
    useEffect(() => {
        const verifySession = async () => {
            const token = localStorage.getItem('elms_token');
            if (token) {
                try {
                    const { data } = await authService.getMe();
                    setUser(data.data);
                } catch {
                    localStorage.removeItem('elms_token');
                    localStorage.removeItem('elms_user');
                    setUser(null);
                }
            }
            setLoading(false);
        };
        verifySession();
    }, []);

    const login = useCallback(async (accountEmail, securedPassword) => {
        const { data } = await authService.login({ accountEmail, securedPassword });
        localStorage.setItem('elms_token', data.token);
        localStorage.setItem('elms_user', JSON.stringify(data.data));
        setUser(data.data);
        return data.data;
    }, []);

    const register = useCallback(async (formData) => {
        const { data } = await authService.register(formData);
        localStorage.setItem('elms_token', data.token);
        localStorage.setItem('elms_user', JSON.stringify(data.data));
        setUser(data.data);
        return data.data;
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

    const value = {
        user,
        loading,
        login,
        register,
        socialAuth,
        requestPasswordReset,
        resetPassword,
        logout,
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
            {!loading && children}
        </AuthContext.Provider>
    );
};
