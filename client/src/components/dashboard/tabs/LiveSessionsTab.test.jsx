import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import LiveSessionsTab from './LiveSessionsTab';

const styles = new Proxy({}, { get: () => ({}) });
const colors = new Proxy({}, { get: () => '#000' });

function renderTab(sessions, filter = 'upcoming') {
    const dash = { colors, allLiveSessions: sessions, liveFilter: filter, setLiveFilter: vi.fn(), styles };
    return render(<LiveSessionsTab {...dash} />);
}

describe('LiveSessionsTab', () => {
    it('shows an empty state when no sessions exist', () => {
        renderTab([]);
        expect(screen.getByText('No upcoming live sessions scheduled.')).toBeInTheDocument();
        expect(screen.queryByText('● Join Now')).not.toBeInTheDocument();
    });

    it('shows the past-sessions empty state on the past filter', () => {
        renderTab([], 'past');
        expect(screen.getByText('No past session recordings available.')).toBeInTheDocument();
    });

    it('renders real sessions with instructor names', () => {
        const future = new Date(Date.now() + 48 * 3600 * 1000).toISOString();
        const sessions = [
            {
                _id: 's1',
                title: 'React Advanced Lab',
                startTime: future,
                durationMinutes: 60,
                instructorRef: { fullName: 'Dr. Ada Smith' },
                meetingLink: 'https://meet.example.com/react',
            },
        ];
        renderTab(sessions);
        expect(screen.getByText('React Advanced Lab')).toBeInTheDocument();
        expect(screen.getByText(/Dr. Ada Smith/)).toBeInTheDocument();
        expect(screen.getByText(/60 min/)).toBeInTheDocument();
    });

    it('keeps an ongoing session in upcoming while finished sessions move to past', () => {
        const now = Date.now();
        const ongoingStart = new Date(now - 30 * 60000).toISOString();
        const finishedStart = new Date(now - 120 * 60000).toISOString();
        const sessions = [
            {
                _id: 'ongoing',
                title: 'Ongoing Session',
                startTime: ongoingStart,
                durationMinutes: 60,
                instructorRef: { fullName: 'Live Host' },
                meetingLink: 'https://meet.example.com/ongoing',
            },
            {
                _id: 'finished',
                title: 'Finished Session',
                startTime: finishedStart,
                durationMinutes: 30,
                instructorRef: { fullName: 'Past Host' },
                meetingLink: 'https://meet.example.com/finished',
            }
        ];

        renderTab(sessions, 'upcoming');
        expect(screen.getByText('Ongoing Session')).toBeInTheDocument();
        expect(screen.queryByText('Finished Session')).not.toBeInTheDocument();

        renderTab(sessions, 'past');
        expect(screen.getByText('Finished Session')).toBeInTheDocument();
        expect(screen.queryByText('Ongoing Session')).not.toBeInTheDocument();
    });
});
