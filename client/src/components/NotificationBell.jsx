import React, { useState, useEffect, useRef } from 'react';
import { Bell, Trash2, CheckCircle2, CheckCheck } from 'lucide-react';
import { notificationService } from '../services/api';
import { useTheme } from '../context/ThemeContext';

export default function NotificationBell() {
    const { colors } = useTheme();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [filter, setFilter] = useState('all'); // 'all' | 'unread'
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
            const list = res.data.data || [];
            setNotifications(list);
            setUnreadCount(res.data.unreadCount ?? list.filter(n => n.isRead === false || n.read === false).length);
        } catch { /* silent */ }
    };

    const handleMarkAllRead = async () => {
        setUnreadCount(0);
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true, read: true })));
        try {
            await notificationService.markAllAsRead();
        } catch (err) {
            console.error('Failed to mark all as read:', err);
        }
    };

    const handleMarkRead = async (id) => {
        const target = notifications.find(n => n._id === id);
        const wasUnread = target && (target.isRead === false || target.read === false);
        if (wasUnread) {
            setUnreadCount(prev => Math.max(0, prev - 1));
        }
        setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true, read: true } : n));
        try {
            await notificationService.markAsRead(id);
        } catch (err) {
            console.error('Failed to mark as read:', err);
        }
    };

    const handleDeleteSingle = async (e, id) => {
        e.stopPropagation();
        const target = notifications.find(n => n._id === id);
        const wasUnread = target && (target.isRead === false || target.read === false);
        setNotifications(prev => prev.filter(n => n._id !== id));
        if (wasUnread) {
            setUnreadCount(prev => Math.max(0, prev - 1));
        }
        try {
            await notificationService.delete(id);
        } catch (err) {
            console.error('Failed to delete notification:', err);
        }
    };

    const handleClearRead = async () => {
        setNotifications(prev => prev.filter(n => n.isRead === false && n.read === false));
        try {
            await notificationService.clearRead();
        } catch (err) {
            console.error('Failed to clear read notifications:', err);
        }
    };

    const handleDeleteAll = async () => {
        const confirmed = window.confirm('Are you sure you want to delete all notifications? This action cannot be undone.');
        if (!confirmed) return;
        setNotifications([]);
        setUnreadCount(0);
        try {
            await notificationService.deleteAll();
        } catch (err) {
            console.error('Failed to delete all notifications:', err);
        }
    };

    const typeIcons = {
        enrollment: '▧', payment: '◈', grade: '▤', quiz: '?',
        announcement: '◈', certificate: '', badge: '️',
        review: '', assignment: '▤', system: '◈️'
    };

    const unreadList = notifications.filter(n => n.isRead === false || n.read === false);
    const readCount = notifications.length - unreadList.length;
    const displayedNotifications = filter === 'unread' ? unreadList : notifications;

    return (
        <div ref={dropdownRef} style={{ position: 'relative' }}>
            <button 
                onClick={() => setIsOpen(!isOpen)} 
                style={{
                    background: 'transparent', 
                    border: 'none', 
                    cursor: 'pointer',
                    position: 'relative', 
                    padding: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '8px',
                    color: colors.text
                }}
                title="Notifications"
                aria-label="Notifications"
            >
                <Bell size={20} strokeWidth={2} />
                {unreadCount > 0 && (
                    <span style={{
                        position: 'absolute', 
                        top: '0px', 
                        right: '0px',
                        background: '#ef4444', 
                        color: '#fff', 
                        borderRadius: '999px',
                        minWidth: '16px', 
                        height: '16px', 
                        fontSize: '10px',
                        fontWeight: '800', 
                        display: 'flex', 
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0 3px',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.2)'
                    }}>{unreadCount > 9 ? '9+' : unreadCount}</span>
                )}
            </button>

            {isOpen && (
                <div style={{
                    position: 'absolute', top: '100%', right: 0, marginTop: '8px',
                    width: '360px', maxWidth: 'calc(100vw - 32px)',
                    maxHeight: '500px', display: 'flex', flexDirection: 'column',
                    background: colors.bgCard, border: `1px solid ${colors.border}`,
                    borderRadius: '12px', boxShadow: '0 12px 32px rgba(0,0,0,0.3)',
                    zIndex: 200, overflow: 'hidden'
                }}>
                    {/* Header Top: Title & Bulk Actions */}
                    <div style={{
                        padding: '12px 14px', borderBottom: `1px solid ${colors.border}`,
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        background: colors.bg
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontWeight: '800', fontSize: '14px', color: colors.text }}>Notifications</span>
                            {unreadCount > 0 && (
                                <span style={{ background: '#ef4444', color: '#fff', fontSize: '10px', fontWeight: 800, borderRadius: 99, padding: '1px 6px' }}>
                                    {unreadCount}
                                </span>
                            )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {unreadCount > 0 && (
                                <button
                                    onClick={handleMarkAllRead}
                                    title="Mark all as read"
                                    style={{
                                        background: 'transparent', border: 'none', color: colors.primary,
                                        fontSize: '11px', fontWeight: '700', cursor: 'pointer',
                                        display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 4px'
                                    }}
                                >
                                    <CheckCircle2 size={12} /> Read all
                                </button>
                            )}
                            {notifications.length > 0 && (
                                <button
                                    onClick={handleDeleteAll}
                                    title="Delete all notifications"
                                    style={{
                                        background: 'transparent', border: 'none', color: '#ef4444',
                                        fontSize: '11px', fontWeight: '700', cursor: 'pointer',
                                        display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 4px'
                                    }}
                                >
                                    <Trash2 size={12} /> Delete all
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Filter and Clear Read Bar */}
                    <div style={{
                        padding: '8px 12px', borderBottom: `1px solid ${colors.border}`,
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        background: colors.bgInput || colors.bgCard, fontSize: '11px'
                    }}>
                        <div style={{ display: 'flex', gap: 4 }}>
                            <button
                                onClick={() => setFilter('all')}
                                style={{
                                    background: filter === 'all' ? colors.primary : 'transparent',
                                    color: filter === 'all' ? '#fff' : colors.textMuted,
                                    border: 'none',
                                    borderRadius: '6px',
                                    padding: '3px 8px',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                }}
                            >
                                All ({notifications.length})
                            </button>
                            <button
                                onClick={() => setFilter('unread')}
                                style={{
                                    background: filter === 'unread' ? colors.primary : 'transparent',
                                    color: filter === 'unread' ? '#fff' : colors.textMuted,
                                    border: 'none',
                                    borderRadius: '6px',
                                    padding: '3px 8px',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                }}
                            >
                                Unread ({unreadList.length})
                            </button>
                        </div>

                        {readCount > 0 && (
                            <button
                                onClick={handleClearRead}
                                title="Remove read notifications"
                                style={{
                                    background: 'transparent', border: 'none', color: colors.textMuted,
                                    fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                                    display: 'inline-flex', alignItems: 'center', gap: 3
                                }}
                            >
                                <CheckCheck size={12} /> Clear read
                            </button>
                        )}
                    </div>

                    {/* Scrollable Notifications List */}
                    <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
                        {displayedNotifications.length === 0 ? (
                            <div style={{ padding: '36px 16px', textAlign: 'center', color: colors.textMuted, fontSize: '13px' }}>
                                {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                            </div>
                        ) : (
                            displayedNotifications.map(n => {
                                const isUnread = n.isRead === false || n.read === false;
                                return (
                                    <div
                                        key={n._id}
                                        onClick={() => handleMarkRead(n._id)}
                                        style={{
                                            padding: '10px 14px', cursor: 'pointer',
                                            borderBottom: `1px solid ${colors.border}`,
                                            background: isUnread ? 'rgba(34,197,94,0.08)' : 'transparent',
                                            transition: 'background 0.15s',
                                            display: 'flex', gap: '10px', alignItems: 'flex-start'
                                        }}
                                    >
                                        <span style={{ fontSize: '18px', flexShrink: 0, marginTop: 1 }}>{typeIcons[n.type] || '◈'}</span>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 6 }}>
                                                <div style={{ fontWeight: isUnread ? '800' : '600', fontSize: '13px', color: colors.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {n.title}
                                                </div>
                                                <div style={{ fontSize: '10px', color: colors.textMuted, flexShrink: 0 }}>
                                                    {n.createdAt ? new Date(n.createdAt).toLocaleDateString() : ''}
                                                </div>
                                            </div>
                                            <div style={{ fontSize: '12px', color: colors.textMuted, lineHeight: 1.4, marginTop: '2px', wordBreak: 'break-word' }}>
                                                {n.message || n.body}
                                            </div>
                                        </div>

                                        {/* Single item delete trash icon */}
                                        <button
                                            type="button"
                                            onClick={(e) => handleDeleteSingle(e, n._id)}
                                            title="Delete notification"
                                            aria-label="Delete notification"
                                            style={{
                                                background: 'transparent',
                                                border: 'none',
                                                color: colors.textMuted,
                                                cursor: 'pointer',
                                                padding: '4px',
                                                borderRadius: '4px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexShrink: 0,
                                                marginTop: 1,
                                                transition: 'color 0.15s, background 0.15s'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.color = '#ef4444';
                                                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.12)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.color = colors.textMuted;
                                                e.currentTarget.style.background = 'transparent';
                                            }}
                                        >
                                            <Trash2 size={14} aria-hidden="true" />
                                        </button>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
