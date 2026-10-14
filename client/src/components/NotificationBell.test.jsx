import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import NotificationBell from './NotificationBell';

vi.mock('../services/api', () => ({
    notificationService: {
        getAll: vi.fn(),
        markAsRead: vi.fn(),
        markAllAsRead: vi.fn(),
        delete: vi.fn(),
        deleteAll: vi.fn(),
        clearRead: vi.fn()
    }
}));

vi.mock('../context/ThemeContext', () => ({
    useTheme: () => ({
        colors: {
            bg: '#ffffff',
            bgCard: '#f8fafc',
            bgInput: '#f1f5f9',
            border: '#e2e8f0',
            text: '#0f172a',
            textMuted: '#64748b',
            primary: '#16a34a'
        }
    })
}));

import { notificationService } from '../services/api';

describe('NotificationBell Component', () => {
    const mockNotifications = [
        {
            _id: 'n1',
            type: 'assignment',
            title: 'Homework 1 Due',
            message: 'Submit your homework before midnight',
            isRead: false,
            read: false,
            createdAt: new Date().toISOString()
        },
        {
            _id: 'n2',
            type: 'announcement',
            title: 'Welcome to Class',
            message: 'Welcome everyone to semester 1',
            isRead: true,
            read: true,
            createdAt: new Date().toISOString()
        }
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        notificationService.getAll.mockResolvedValue({
            data: {
                data: [...mockNotifications],
                unreadCount: 1
            }
        });
        notificationService.delete.mockResolvedValue({ data: { success: true } });
        notificationService.deleteAll.mockResolvedValue({ data: { success: true } });
        notificationService.clearRead.mockResolvedValue({ data: { success: true } });
        notificationService.markAllAsRead.mockResolvedValue({ data: { success: true } });
        notificationService.markAsRead.mockResolvedValue({ data: { success: true } });
    });

    it('renders the bell button with unread count badge and opens dropdown on click', async () => {
        render(<NotificationBell />);

        await waitFor(() => {
            expect(notificationService.getAll).toHaveBeenCalled();
        });

        const bellButton = screen.getByRole('button', { name: /notifications/i });
        expect(bellButton).toBeInTheDocument();

        // Click to open dropdown
        fireEvent.click(bellButton);

        expect(screen.getByText('Notifications')).toBeInTheDocument();
        expect(screen.getByText('Homework 1 Due')).toBeInTheDocument();
        expect(screen.getByText('Welcome to Class')).toBeInTheDocument();
    });

    it('filters between All and Unread notifications', async () => {
        render(<NotificationBell />);

        const bellButton = screen.getByRole('button', { name: /notifications/i });
        fireEvent.click(bellButton);

        await waitFor(() => {
            expect(screen.getByText('Homework 1 Due')).toBeInTheDocument();
            expect(screen.getByText('Welcome to Class')).toBeInTheDocument();
        });

        // Click "Unread" filter
        const unreadFilterBtn = screen.getByRole('button', { name: /unread \(1\)/i });
        fireEvent.click(unreadFilterBtn);

        // Only unread notification should be displayed
        expect(screen.getByText('Homework 1 Due')).toBeInTheDocument();
        expect(screen.queryByText('Welcome to Class')).not.toBeInTheDocument();

        // Click "All" filter
        const allFilterBtn = screen.getByRole('button', { name: /all \(2\)/i });
        fireEvent.click(allFilterBtn);

        expect(screen.getByText('Homework 1 Due')).toBeInTheDocument();
        expect(screen.getByText('Welcome to Class')).toBeInTheDocument();
    });

    it('deletes a single notification when clicking trash icon and updates UI immediately', async () => {
        render(<NotificationBell />);

        const bellButton = screen.getByRole('button', { name: /notifications/i });
        fireEvent.click(bellButton);

        await waitFor(() => {
            expect(screen.getByText('Homework 1 Due')).toBeInTheDocument();
        });

        const deleteButtons = screen.getAllByRole('button', { name: /delete notification/i });
        expect(deleteButtons.length).toBe(2);

        // Delete first notification (n1)
        fireEvent.click(deleteButtons[0]);

        expect(notificationService.delete).toHaveBeenCalledWith('n1');

        // Immediately disappears from UI
        await waitFor(() => {
            expect(screen.queryByText('Homework 1 Due')).not.toBeInTheDocument();
            expect(screen.getByText('Welcome to Class')).toBeInTheDocument();
        });
    });

    it('clears only read notifications when clicking Clear Read', async () => {
        render(<NotificationBell />);

        const bellButton = screen.getByRole('button', { name: /notifications/i });
        fireEvent.click(bellButton);

        await waitFor(() => {
            expect(screen.getByText('Welcome to Class')).toBeInTheDocument();
        });

        const clearReadBtn = screen.getByRole('button', { name: /clear read/i });
        fireEvent.click(clearReadBtn);

        expect(notificationService.clearRead).toHaveBeenCalled();

        await waitFor(() => {
            expect(screen.queryByText('Welcome to Class')).not.toBeInTheDocument();
            expect(screen.getByText('Homework 1 Due')).toBeInTheDocument();
        });
    });

    it('requires confirmation and deletes all notifications when confirmed', async () => {
        const confirmSpy = vi.spyOn(window, 'confirm');
        confirmSpy.mockReturnValue(true);

        render(<NotificationBell />);

        const bellButton = screen.getByRole('button', { name: /notifications/i });
        fireEvent.click(bellButton);

        await waitFor(() => {
            expect(screen.getByText('Homework 1 Due')).toBeInTheDocument();
        });

        const deleteAllBtn = screen.getByRole('button', { name: /delete all/i });
        fireEvent.click(deleteAllBtn);

        expect(confirmSpy).toHaveBeenCalledWith(
            expect.stringContaining('Are you sure you want to delete all notifications?')
        );
        expect(notificationService.deleteAll).toHaveBeenCalled();

        await waitFor(() => {
            expect(screen.getByText('No notifications yet')).toBeInTheDocument();
        });

        confirmSpy.mockRestore();
    });

    it('aborts delete all if user cancels confirmation', async () => {
        const confirmSpy = vi.spyOn(window, 'confirm');
        confirmSpy.mockReturnValue(false);

        render(<NotificationBell />);

        const bellButton = screen.getByRole('button', { name: /notifications/i });
        fireEvent.click(bellButton);

        await waitFor(() => {
            expect(screen.getByText('Homework 1 Due')).toBeInTheDocument();
        });

        const deleteAllBtn = screen.getByRole('button', { name: /delete all/i });
        fireEvent.click(deleteAllBtn);

        expect(confirmSpy).toHaveBeenCalled();
        expect(notificationService.deleteAll).not.toHaveBeenCalled();
        expect(screen.getByText('Homework 1 Due')).toBeInTheDocument();

        confirmSpy.mockRestore();
    });
});
