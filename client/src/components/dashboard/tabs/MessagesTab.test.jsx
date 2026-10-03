import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import MessagesTab from './MessagesTab';
import { messageService } from '../../../services/api';

vi.mock('../../../services/api', () => ({
    messageService: {
        getConversations: vi.fn().mockResolvedValue({ data: { data: [] } }),
        getMessagesRaw: vi.fn().mockResolvedValue({ data: { data: [] } }),
        sendMessageDirect: vi.fn().mockResolvedValue({ data: { data: {} } }),
    },
    notificationService: {
        getAll: vi.fn().mockResolvedValue({ data: { data: [] } }),
        markAsRead: vi.fn().mockResolvedValue({}),
        markAllAsRead: vi.fn().mockResolvedValue({}),
    },
    discussionService: {
        getByCourse: vi.fn().mockResolvedValue({ data: { data: [] } }),
        addReply: vi.fn().mockResolvedValue({ data: { data: {} } }),
        upvote: vi.fn().mockResolvedValue({ data: { data: {} } }),
    },
    aiService: {
        getHistory: vi.fn().mockResolvedValue({ data: { data: [] } }),
        askQuestion: vi.fn().mockResolvedValue({ data: { data: {} } }),
    },
}));

const styles = new Proxy({}, { get: () => ({}) });
const colors = new Proxy({}, { get: () => '#000' });

function renderTab(conversations, user) {
    messageService.getConversations.mockResolvedValue({ data: { data: conversations } });
    const dash = {
        user,
        colors,
        conversations,
        activeConversation: null,
        setActiveConversation: vi.fn(),
        conversationMessages: [],
        setConversationMessages: vi.fn(),
        messageInput: '',
        setMessageInput: vi.fn(),
        messageSending: false,
        setMessageSending: vi.fn(),
        navigate: vi.fn(),
        messagesEndRef: { current: null },
        styles,
    };
    return render(<MessagesTab {...dash} />);
}

describe('MessagesTab', () => {
    it('shows an honest empty state when there are no conversations', async () => {
        renderTab([], { _id: 'me1' });
        expect(await screen.findByText(/No conversations yet\./)).toBeInTheDocument();
        expect(screen.getByText('Select a conversation to start messaging')).toBeInTheDocument();
    });

    it('resolves conversation titles from real participants', async () => {
        const conversations = [
            {
                _id: 'c1',
                participants: [
                    { userRef: { _id: 'me1' }, role: 'student' },
                    { userRef: { _id: 'them1', fullName: 'Prof. Ada Lovelace' }, role: 'instructor' },
                ],
                lastMessage: 'Check your submission',
            },
        ];
        renderTab(conversations, { _id: 'me1' });
        expect(await screen.findByText('Prof. Ada Lovelace')).toBeInTheDocument();
        expect(screen.getByText('Check your submission')).toBeInTheDocument();
    });
});
