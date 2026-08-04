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
        const normalizedEmail = accountEmail?.trim().toLowerCase();
        const { data } = await authService.login({ accountEmail: normalizedEmail, securedPassword });
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
            {loading ? (
                <div style={{
                    minHeight: '100vh',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#0f172a',
                    color: '#fff',
                    fontFamily: 'system-ui, sans-serif'
                }}>
                    <div style={{
                        width: '48px',
                        height: '48px',
                        border: '4px solid rgba(59,130,246,0.2)',
                        borderTopColor: '#3b82f6',
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite'
                    }} />
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                    <p style={{ marginTop: '16px', color: '#94a3b8', fontSize: '14px', fontWeight: '600' }}>Loading Emare ELMS...</p>
                </div>
            ) : children}
        </AuthContext.Provider>
    );
};
