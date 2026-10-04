import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import LeaderboardTab from './LeaderboardTab';

const styles = new Proxy({}, { get: () => ({}) });
const colors = new Proxy({}, { get: () => '#000' });

function renderTab(board) {
    const dash = { user: { _id: 'me1' }, colors, leaderboard: board, styles };
    return render(<LeaderboardTab {...dash} />);
}

describe('LeaderboardTab', () => {
    it('shows a real empty state when there is no leaderboard data', () => {
        renderTab([]);
        expect(screen.getByText(/No leaderboard data yet/)).toBeInTheDocument();
        expect(screen.queryByText('Rank')).not.toBeInTheDocument();
    });

    it('renders only real leaderboard entries', () => {
        const board = [
            { _id: 'u1', fullName: 'Jane Doe', gamificationPoints: 1500, level: 5 },
            { _id: 'u2', fullName: 'John Roe', gamificationPoints: 900, level: 3 },
        ];
        renderTab(board);
        expect(screen.getByText('Jane Doe')).toBeInTheDocument();
        expect(screen.getByText('John Roe')).toBeInTheDocument();
        expect(screen.getByText('1,500 XP')).toBeInTheDocument();
        expect(screen.getAllByText('900 XP').length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText('Lv 5')).toBeInTheDocument();
    });
});
