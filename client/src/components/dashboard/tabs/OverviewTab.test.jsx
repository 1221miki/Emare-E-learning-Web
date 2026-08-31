import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import OverviewTab from './OverviewTab';

const styles = new Proxy({}, { get: () => ({}) });
const colors = new Proxy({}, { get: () => '#000' });

function renderTab(overrides = {}) {
    const dash = {
        user: { _id: 'me1', fullName: 'Test Student' },
        colors,
        setActiveTab: vi.fn(),
        enrollments: [],
        grades: [],
        certificates: [],
        allCourses: [],
        notifications: [],
        liveSessions: [],
        assignmentsList: [],
        recentlyViewed: [],
        studyTargetHours: 10,
        studyCompletedHours: 0,
        notificationTab: 'announcements',
        setNotificationTab: vi.fn(),
        leaderboard: [],
        hiddenWidgets: {},
        pinnedCourses: [],
        navigate: vi.fn(),
        toggleWidgetVisibility: vi.fn(),
        togglePinCourse: vi.fn(),
        triggerAssistantPrompt: vi.fn(),
        handleMarkNotificationAsRead: vi.fn(),
        handleUpdateStudyTarget: vi.fn(),
        completedCoursesCount: 0,
        averageProgress: 0,
        xpPoints: 0,
        currentLevel: 1,
        nextLevelXP: 2000,
        xpProgress: 0,
        currentCourseTitle: 'Test Course',
        currentLessonTitle: 'Lesson 1',
        currentProgress: 0,
        quizAverage: 0,
        pendingAssignmentsCount: 0,
        badges: [],
        styles,
        ...overrides,
    };
    return render(<OverviewTab {...dash} />);
}

describe('OverviewTab', () => {
    it('shows a schedule empty state when there are no live sessions', () => {
        renderTab();
        expect(screen.getByText('No upcoming live classes or events scheduled.')).toBeInTheDocument();
    });

    it('shows live sessions in the schedule', () => {
        const start = new Date(Date.now() + 3 * 86400 * 1000).toISOString();
        renderTab({
            liveSessions: [
                { _id: 'live1', title: 'Live Class: Intro to React', startTime: start },
            ],
        });
        expect(screen.getByText('Live Class: Intro to React')).toBeInTheDocument();
    });

    it('shows the four KPI stat cards in a compact row', () => {
        renderTab({ activeCourses: [{ _id: 'e1' }], pendingAssignmentsCount: 3, quizAverage: 78, xpPoints: 420 });
        expect(screen.getByText('In Progress Courses')).toBeInTheDocument();
        expect(screen.getByText('Pending Assignments')).toBeInTheDocument();
        expect(screen.getByText('Quiz Average')).toBeInTheDocument();
        expect(screen.getByText('XP Earned')).toBeInTheDocument();
    });

    it('does not render the locked badges gallery on the overview', () => {
        renderTab();
        expect(screen.queryByText('7-Day Streak')).not.toBeInTheDocument();
        expect(screen.queryByText('LOCKED')).not.toBeInTheDocument();
    });
});
