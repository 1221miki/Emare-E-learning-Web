import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import MessagesTab from './MessagesTab';

vi.mock('../../../services/api', () => ({
    messageService: {
        getConversations: vi.fn().mockResolvedValue({ data: { data: [] } }),
        getMessagesRaw: vi.fn().mockResolvedValue({ data: { data: [] } }),
        sendMessageDirect: vi.fn()
    },
    notificationService: {
        getAll: vi.fn(),
        markAsRead: vi.fn(),
        markAllAsRead: vi.fn(),
        delete: vi.fn(),
        deleteAll: vi.fn(),
        clearRead: vi.fn()
    },
    discussionService: {
        getByCourse: vi.fn().mockResolvedValue({ data: { data: [] } })
    },
    aiService: {
        getHistory: vi.fn().mockResolvedValue({ data: { data: [] } })
    }
}));

import { notificationService } from '../../../services/api';

const mockColors = {
    bg: '#ffffff',
    bgCard: '#f8fafc',
    bgInput: '#f1f5f9',
    border: '#e2e8f0',
    text: '#0f172a',
    textMuted: '#64748b',
    primary: '#16a34a',
    success: '#10b981'
};

const mockStyles = {
    tabHeader: {},
    tabTitle: {},
    tabSubtitle: {},
    panelCard: {},
    emptyContent: {},
    emptyText: {}
};

describe('MessagesTab - Notification Center', () => {
    const mockNotifs = [
        {
            _id: 'notif-1',
            type: 'assignment',
            title: 'Project Submission',
            message: 'Submit your code repository link',
            isRead: false,
            read: false,
            createdAt: new Date().toISOString()
        },
        {
            _id: 'notif-2',
            type: 'quiz',
            title: 'Quiz 3 Completed',
            message: 'Your score was recorded',
            isRead: true,
            read: true,
            createdAt: new Date().toISOString()
        }
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        notificationService.getAll.mockResolvedValue({
            data: {
                data: [...mockNotifs],
                unreadCount: 1
            }
        });
        notificationService.delete.mockResolvedValue({ data: { success: true } });
        notificationService.deleteAll.mockResolvedValue({ data: { success: true } });
        notificationService.clearRead.mockResolvedValue({ data: { success: true } });
        notificationService.markAllAsRead.mockResolvedValue({ data: { success: true } });
        notificationService.markAsRead.mockResolvedValue({ data: { success: true } });
    });

    const renderNotificationCenter = () => {
        return render(
            <MessagesTab
                user={{ _id: 'user-123', fullName: 'Student John' }}
                colors={mockColors}
                styles={mockStyles}
                enrollments={[]}
                messagesSection="notifications"
                setMessagesSection={vi.fn()}
            />
        );
    };

    it('renders the Notification Center with All and Unread filter buttons', async () => {
        renderNotificationCenter();

        await waitFor(() => {
            expect(screen.getAllByText('Notification Center').length).toBeGreaterThan(0);
            expect(screen.getByText('Project Submission')).toBeInTheDocument();
            expect(screen.getByText('Quiz 3 Completed')).toBeInTheDocument();
        });

        expect(screen.getByRole('button', { name: /all \(2\)/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /unread \(1\)/i })).toBeInTheDocument();
    });

    it('filters between All and Unread in Notification Center', async () => {
        renderNotificationCenter();

        await waitFor(() => {
            expect(screen.getByText('Project Submission')).toBeInTheDocument();
        });

        // Switch to Unread
        const unreadFilter = screen.getByRole('button', { name: /unread \(1\)/i });
        fireEvent.click(unreadFilter);

        expect(screen.getByText('Project Submission')).toBeInTheDocument();
        expect(screen.queryByText('Quiz 3 Completed')).not.toBeInTheDocument();

        // Switch back to All
        const allFilter = screen.getByRole('button', { name: /all \(2\)/i });
        fireEvent.click(allFilter);

        expect(screen.getByText('Project Submission')).toBeInTheDocument();
        expect(screen.getByText('Quiz 3 Completed')).toBeInTheDocument();
    });

    it('deletes a single notification via the trash icon and removes it immediately from UI', async () => {
        renderNotificationCenter();

        await waitFor(() => {
            expect(screen.getByText('Project Submission')).toBeInTheDocument();
        });

        const trashButtons = screen.getAllByRole('button', { name: /delete notification/i });
        expect(trashButtons.length).toBe(2);

        // Delete first notification
        fireEvent.click(trashButtons[0]);

        expect(notificationService.delete).toHaveBeenCalledWith('notif-1');

        await waitFor(() => {
            expect(screen.queryByText('Project Submission')).not.toBeInTheDocument();
            expect(screen.getByText('Quiz 3 Completed')).toBeInTheDocument();
        });
    });

    it('clears only read notifications when Clear Read is clicked', async () => {
        renderNotificationCenter();

        await waitFor(() => {
            expect(screen.getByText('Quiz 3 Completed')).toBeInTheDocument();
        });

        const clearReadBtn = screen.getByRole('button', { name: /clear read/i });
        fireEvent.click(clearReadBtn);

        expect(notificationService.clearRead).toHaveBeenCalled();

        await waitFor(() => {
            expect(screen.queryByText('Quiz 3 Completed')).not.toBeInTheDocument();
            expect(screen.getByText('Project Submission')).toBeInTheDocument();
        });
    });

    it('confirms and deletes all notifications when Delete All is clicked', async () => {
        const confirmSpy = vi.spyOn(window, 'confirm');
        confirmSpy.mockReturnValue(true);

        renderNotificationCenter();

        await waitFor(() => {
            expect(screen.getByText('Project Submission')).toBeInTheDocument();
        });

        const deleteAllBtn = screen.getByRole('button', { name: /delete all/i });
        fireEvent.click(deleteAllBtn);

        expect(confirmSpy).toHaveBeenCalledWith(
            expect.stringContaining('Are you sure you want to delete all notifications?')
        );
        expect(notificationService.deleteAll).toHaveBeenCalled();

        await waitFor(() => {
            expect(screen.queryByText('Project Submission')).not.toBeInTheDocument();
            expect(screen.queryByText('Quiz 3 Completed')).not.toBeInTheDocument();
        });

        confirmSpy.mockRestore();
    });
});
