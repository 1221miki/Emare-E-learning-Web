import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MessageInboxPage from './MessageInboxPage';

// Mock dependencies
vi.mock('../components/Sidebar', () => ({
    default: () => <div data-testid="sidebar">Sidebar</div>,
}));

vi.mock('../context/ThemeContext', () => ({
    useTheme: () => ({
        theme: 'light',
        colors: {
            bg: '#ffffff',
            bgCard: '#f8fafc',
            bgInput: '#f0fdf4',
            primary: '#16a34a',
            accent: '#15803d',
            text: '#111827',
            textMuted: '#64748b',
            border: '#e2e8f0',
        },
    }),
}));

const mockUser = {
    id: 'instructor-123',
    _id: 'instructor-123',
    fullName: 'Almaz Wubshet',
    assignedRole: 'Instructor'
};

vi.mock('../context/AuthContext', () => ({
    useAuth: () => ({ user: mockUser, isAuthenticated: true }),
}));

const mockConversations = [
    {
        _id: 'convo-active-1',
        title: null,
        displayTitle: 'Asamn Agiz',
        isRecipientAvailable: true,
        participants: [
            { userRef: { _id: 'instructor-123', fullName: 'Almaz Wubshet', assignedRole: 'Instructor' } },
            { userRef: { _id: 'student-456', fullName: 'Asamn Agiz', assignedRole: 'Student' } }
        ],
        lastMessage: 'Hello Professor',
        lastMessageAt: new Date().toISOString()
    },
    {
        _id: 'convo-orphan-2',
        title: null,
        displayTitle: 'Unavailable User',
        isRecipientAvailable: false,
        participants: [
            { userRef: { _id: 'instructor-123', fullName: 'Almaz Wubshet', assignedRole: 'Instructor' } },
            { userRef: null }
        ],
        lastMessage: 'Old archived message',
        lastMessageAt: new Date(Date.now() - 500000).toISOString()
    }
];

const mockMessages = [
    {
        _id: 'msg-1',
        conversationRef: 'convo-active-1',
        senderRef: { _id: 'instructor-123', fullName: 'Almaz Wubshet' },
        body: 'Hello Asamn!',
        createdAt: new Date().toISOString()
    },
    {
        _id: 'msg-2',
        conversationRef: 'convo-active-1',
        senderRef: { _id: 'student-456', fullName: 'Asamn Agiz' },
        body: 'Hello Professor',
        createdAt: new Date().toISOString()
    }
];

vi.mock('../services/api', () => ({
    messageService: {
        getConversations: vi.fn(),
        getMessagesRaw: vi.fn(),
        sendMessageDirect: vi.fn()
    },
    userService: {
        getAll: vi.fn().mockResolvedValue({ data: { data: [] } })
    }
}));

vi.mock('../services/socket', () => ({
    initSocket: vi.fn(),
    joinConversationRoom: vi.fn(),
    leaveConversationRoom: vi.fn(),
    onNewMessage: vi.fn(),
    offNewMessage: vi.fn(),
    onDirectMessage: vi.fn(),
    offDirectMessage: vi.fn(),
    onConversationUpdated: vi.fn(),
    offConversationUpdated: vi.fn()
}));

import { messageService } from '../services/api';

describe('MessageInboxPage Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.HTMLElement.prototype.scrollIntoView = vi.fn();
        messageService.getConversations.mockResolvedValue({ data: { success: true, data: mockConversations } });
        messageService.getMessagesRaw.mockResolvedValue({ data: { success: true, data: mockMessages } });
    });

    it('renders conversations and identifies the other participant correctly', async () => {
        render(
            <MemoryRouter>
                <MessageInboxPage />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Asamn Agiz')).toBeInTheDocument();
            expect(screen.getByText('Unavailable User')).toBeInTheDocument();
        });
    });

    it('loads messages and sends a reply when an active conversation is clicked', async () => {
        messageService.sendMessageDirect.mockResolvedValue({
            data: {
                success: true,
                data: {
                    _id: 'msg-new-3',
                    conversationRef: 'convo-active-1',
                    senderRef: { _id: 'instructor-123', fullName: 'Almaz Wubshet' },
                    body: 'Looking forward to your submission',
                    createdAt: new Date().toISOString()
                }
            }
        });

        render(
            <MemoryRouter>
                <MessageInboxPage />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Asamn Agiz')).toBeInTheDocument();
        });

        // Click on Asamn Agiz conversation
        fireEvent.click(screen.getByText('Asamn Agiz'));

        await waitFor(() => {
            expect(screen.getByText('Hello Asamn!')).toBeInTheDocument();
            expect(screen.getAllByText('Hello Professor').length).toBeGreaterThan(0);
        });

        // Type a new message
        const input = screen.getByPlaceholderText('Write a message...');
        fireEvent.change(input, { target: { value: 'Looking forward to your submission' } });

        const sendBtn = screen.getByRole('button', { name: /send/i });
        fireEvent.click(sendBtn);

        await waitFor(() => {
            expect(messageService.sendMessageDirect).toHaveBeenCalledWith({
                conversationId: 'convo-active-1',
                receiverId: 'student-456',
                body: 'Looking forward to your submission'
            });
        });
    });

    it('disables input and displays styled warning notice for unavailable recipient', async () => {
        render(
            <MemoryRouter>
                <MessageInboxPage />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Unavailable User')).toBeInTheDocument();
        });

        // Click on the conversation with deleted participant
        fireEvent.click(screen.getByText('Unavailable User'));

        await waitFor(() => {
            expect(screen.getByText(/This user account is no longer available/i)).toBeInTheDocument();
            const input = screen.getByPlaceholderText(/Messaging disabled for inactive recipient/i);
            expect(input).toBeDisabled();
        });
    });
});
