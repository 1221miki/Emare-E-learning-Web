import React, { useState, useEffect, useRef } from 'react';
import { notificationService } from '../services/api';
import { useTheme } from '../context/ThemeContext';

export default function NotificationBell() {
    const { colors } = useTheme();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000); // Poll every 30s
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchNotifications = async () => {
        try {
            const res = await notificationService.getAll();
            setNotifications(res.data.data || []);
            setUnreadCount(res.data.unreadCount || 0);
        } catch { /* silent */ }
    };

    const handleMarkAllRead = async () => {
        await notificationService.markAllAsRead();
        setUnreadCount(0);
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    };

    const handleMarkRead = async (id) => {
        await notificationService.markAsRead(id);
        setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
    };

    const typeIcons = {
        enrollment: '📚', payment: '💳', grade: '📝', quiz: '❓',
        announcement: '📢', certificate: '🏆', badge: '🎖️',
        review: '⭐', assignment: '📄', system: '⚙️'
    };

    return (
        <div ref={dropdownRef} style={{ position: 'relative' }}>
            <button onClick={() => setIsOpen(!isOpen)} style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                fontSize: '22px', position: 'relative', padding: '8px'
            }}>
                🔔
                {unreadCount > 0 && (
                    <span style={{
                        position: 'absolute', top: '2px', right: '2px',
                        background: '#ef4444', color: '#fff', borderRadius: '50%',
                        width: '18px', height: '18px', fontSize: '11px',
                        fontWeight: '800', display: 'flex', alignItems: 'center',
                        justifyContent: 'center'
                    }}>{unreadCount > 9 ? '9+' : unreadCount}</span>
                )}
            </button>

            {isOpen && (
                <div style={{
                    position: 'absolute', top: '100%', right: 0, width: '360px',
                    maxHeight: '460px', overflowY: 'auto',
                    background: colors.bgCard, border: `1px solid ${colors.border}`,
                    borderRadius: '12px', boxShadow: '0 12px 32px rgba(0,0,0,0.3)',
                    zIndex: 200
                }}>
                    <div style={{
                        padding: '14px 16px', borderBottom: `1px solid ${colors.border}`,
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}>
                        <span style={{ fontWeight: '800', fontSize: '15px', color: colors.text }}>Notifications</span>
                        {unreadCount > 0 && (
                            <button onClick={handleMarkAllRead} style={{
                                background: 'transparent', border: 'none', color: colors.primary,
                                fontSize: '12px', fontWeight: '700', cursor: 'pointer'
                            }}>Mark all read</button>
                        )}
                    </div>

                    {notifications.length === 0 ? (
                        <div style={{ padding: '40px 16px', textAlign: 'center', color: colors.textMuted }}>
                            No notifications yet
                        </div>
                    ) : (
                        notifications.slice(0, 20).map(n => (
                            <div
                                key={n._id}
                                onClick={() => handleMarkRead(n._id)}
                                style={{
                                    padding: '12px 16px', cursor: 'pointer',
                                    borderBottom: `1px solid ${colors.border}`,
                                    background: n.isRead ? 'transparent' : (colors.bg === '#0f172a' ? 'rgba(59,130,246,0.08)' : 'rgba(59,130,246,0.05)'),
                                    transition: 'background 0.15s'
                                }}
                            >
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                                    <span style={{ fontSize: '20px', flexShrink: 0 }}>{typeIcons[n.type] || '🔔'}</span>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: '700', fontSize: '13px', color: colors.text, marginBottom: '2px' }}>{n.title}</div>
                                        <div style={{ fontSize: '12px', color: colors.textMuted, lineHeight: 1.4 }}>{n.message}</div>
                                        <div style={{ fontSize: '11px', color: colors.textMuted, marginTop: '4px' }}>
                                            {new Date(n.createdAt).toLocaleDateString()}
                                        </div>
                                    </div>
                                    {!n.isRead && <div style={{
                                        width: '8px', height: '8px', borderRadius: '50%',
                                        background: colors.primary, flexShrink: 0, marginTop: '4px'
                                    }} />}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
