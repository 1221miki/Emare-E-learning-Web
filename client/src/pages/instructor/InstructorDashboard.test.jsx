import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import InstructorDashboard from './InstructorDashboard';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate
    };
});

vi.mock('../../context/AuthContext', () => ({
    useAuth: () => ({
        user: { _id: 'inst-1', fullName: 'Dr. Jane Smith', assignedRole: 'Instructor' },
        logout: vi.fn(),
        isSuspended: false
    })
}));

vi.mock('../../context/ThemeContext', () => ({
    useTheme: () => ({
        theme: 'dark',
        toggleTheme: vi.fn(),
        colors: {
            bg: '#0b1120',
            bgCard: '#111a2e',
            bgInput: 'rgba(148,163,184,0.1)',
            border: '#24304d',
            text: '#dbe2f0',
            textMuted: '#93a1bd',
            primary: '#22c55e',
            bgDarkest: '#070b16'
        }
    })
}));

vi.mock('../../components/Sidebar', () => ({
    default: ({ navItems = [], onTabChange }) => (
        <nav data-testid="sidebar">
            {navItems.map(item => (
                <button key={item.key} onClick={() => onTabChange && onTabChange(item.key)}>
                    {item.label}
                </button>
            ))}
        </nav>
    )
}));

vi.mock('../../components/instructor/InstructorOverview', () => ({
    default: () => <div>Instructor Overview</div>
}));

vi.mock('../../components/instructor/StudentManagement', () => ({
    default: () => <div>Student Management</div>
}));

vi.mock('../../components/instructor/InstructorSettings', () => ({
    default: () => <div>Instructor Settings</div>
}));

vi.mock('../../components/instructor/InstructorLiveSessions', () => ({
    default: () => <div>Instructor Live Sessions</div>
}));

vi.mock('../../services/api', () => ({
    courseService: {
        getInstructorCourses: vi.fn(),
        getInstructorAnalytics: vi.fn().mockResolvedValue({ data: { data: {} } }),
        delete: vi.fn().mockResolvedValue({ data: { success: true } }),
        archive: vi.fn(),
        unpublish: vi.fn()
    },
    quizService: {
        getInstructorQuizzes: vi.fn().mockResolvedValue({ data: { data: [] } })
    },
    gradebookService: {},
    reviewService: {
        getInstructorReviews: vi.fn().mockResolvedValue({ data: { data: [] } })
    },
    userService: {
        getProfile: vi.fn().mockResolvedValue({ data: { data: {} } })
    },
    enrollmentService: {},
    assignmentService: {
        getInstructorAssignments: vi.fn().mockResolvedValue({ data: { data: [] } })
    },
    uploadService: {},
    notificationService: {
        getAll: vi.fn().mockResolvedValue({ data: { data: [], unreadCount: 0 } })
    },
    liveSessionService: {
        getInstructorSessions: vi.fn().mockResolvedValue({ data: { data: [] } }),
        getInstructorRecordings: vi.fn().mockResolvedValue({ data: { data: [] } }),
        getCourseSessions: vi.fn().mockResolvedValue({ data: { data: [] } }),
        getIntegrations: vi.fn().mockResolvedValue({ data: { data: { zoomConfigured: false } } })
    }
}));

import { courseService } from '../../services/api';

describe('InstructorDashboard - Course Management Actions Column', () => {
    const mockCourses = [
        {
            _id: 'course-123',
            courseTitle: 'Full-Stack Web Engineering',
            subtitle: 'Master Node.js, React, and MongoDB',
            technicalCategory: 'Web Coding',
            level: 'Intermediate',
            language: 'English',
            price: 500,
            totalEnrollments: 42,
            averageRating: 4.8,
            publicationState: 'Published'
        }
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        courseService.getInstructorCourses.mockResolvedValue({
            data: { data: [...mockCourses] }
        });
    });

    const renderDashboardInCoursesTab = async () => {
        const utils = render(
            <BrowserRouter>
                <InstructorDashboard />
            </BrowserRouter>
        );

        // Click on My Courses tab in navigation
        await waitFor(() => {
            expect(screen.getByText('My Courses')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('My Courses'));

        await waitFor(() => {
            expect(screen.getByText('Full-Stack Web Engineering')).toBeInTheDocument();
        });

        return utils;
    };

    it('keeps Preview visible directly in the Actions column', async () => {
        await renderDashboardInCoursesTab();

        const previewButton = screen.getByRole('button', { name: /preview/i });
        expect(previewButton).toBeInTheDocument();

        // Edit Info, NewWizard, Delete should NOT be in the table row directly
        expect(screen.queryByRole('button', { name: /^edit info$/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /^newwizard$/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /^delete$/i })).not.toBeInTheDocument();
    });

    it('navigates to course preview when clicking Preview', async () => {
        await renderDashboardInCoursesTab();

        const previewButton = screen.getByRole('button', { name: /preview/i });
        fireEvent.click(previewButton);

        expect(mockNavigate).toHaveBeenCalledWith('/courses/course-123');
    });

    it('renders the three-dot button and reveals Edit Info, NewWizard, and Delete in dropdown when clicked', async () => {
        await renderDashboardInCoursesTab();

        const threeDotBtn = screen.getByRole('button', { name: /actions for full-stack web engineering/i });
        expect(threeDotBtn).toBeInTheDocument();

        // Click three-dot button
        fireEvent.click(threeDotBtn);

        // Dropdown menu items should now be visible
        const editBtn = screen.getByRole('button', { name: /edit info/i });
        const newWizardBtn = screen.getByRole('button', { name: /newwizard/i });
        const deleteBtn = screen.getByRole('button', { name: /delete/i });

        expect(editBtn).toBeInTheDocument();
        expect(newWizardBtn).toBeInTheDocument();
        expect(deleteBtn).toBeInTheDocument();
    });

    it('navigates to /instructor/courses/new when clicking NewWizard in the dropdown', async () => {
        await renderDashboardInCoursesTab();

        const threeDotBtn = screen.getByRole('button', { name: /actions for full-stack web engineering/i });
        fireEvent.click(threeDotBtn);

        const newWizardBtn = screen.getByRole('button', { name: /newwizard/i });
        fireEvent.click(newWizardBtn);

        expect(mockNavigate).toHaveBeenCalledWith('/instructor/courses/new');
    });

    it('opens the Edit Course modal when clicking Edit Info in the dropdown', async () => {
        await renderDashboardInCoursesTab();

        const threeDotBtn = screen.getByRole('button', { name: /actions for full-stack web engineering/i });
        fireEvent.click(threeDotBtn);

        const editBtn = screen.getByRole('button', { name: /edit info/i });
        fireEvent.click(editBtn);

        await waitFor(() => {
            expect(screen.getByText('Edit Course')).toBeInTheDocument();
        });
    });

    it('calls handleDeleteCourse when clicking Delete in the dropdown', async () => {
        const confirmSpy = vi.spyOn(window, 'confirm');
        confirmSpy.mockReturnValue(true);

        await renderDashboardInCoursesTab();

        const threeDotBtn = screen.getByRole('button', { name: /actions for full-stack web engineering/i });
        fireEvent.click(threeDotBtn);

        const deleteBtn = screen.getByRole('button', { name: /delete/i });
        fireEvent.click(deleteBtn);

        expect(confirmSpy).toHaveBeenCalledWith(
            expect.stringContaining('Are you sure you want to permanently delete this course?')
        );
        expect(courseService.delete).toHaveBeenCalledWith('course-123');

        confirmSpy.mockRestore();
    });

    it('closes the dropdown when clicking outside', async () => {
        await renderDashboardInCoursesTab();

        const threeDotBtn = screen.getByRole('button', { name: /actions for full-stack web engineering/i });
        fireEvent.click(threeDotBtn);

        expect(screen.getByRole('button', { name: /edit info/i })).toBeInTheDocument();

        // Simulate click outside
        fireEvent.mouseDown(document.body);

        await waitFor(() => {
            expect(screen.queryByRole('button', { name: /edit info/i })).not.toBeInTheDocument();
        });
    });
});
