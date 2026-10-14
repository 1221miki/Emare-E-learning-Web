import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import StudentManagement from './StudentManagement';
import { courseService, enrollmentService, gradebookService, assignmentService } from '../../services/api';

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

vi.mock('../../services/api', () => ({
    courseService: {
        getInstructorCourses: vi.fn()
    },
    enrollmentService: {
        getAll: vi.fn()
    },
    gradebookService: {
        getSubmissionsForCourse: vi.fn()
    },
    assignmentService: {
        getByCourse: vi.fn()
    }
}));

describe('StudentManagement Component', () => {
    const mockCourses = [
        {
            _id: 'c1',
            courseTitle: 'React Mastery',
            totalEnrollments: 2,
            averageRating: 4.8,
            totalReviews: 5,
            level: 'Beginner',
            publicationState: 'Active'
        },
        {
            _id: 'c2',
            courseTitle: 'Advanced Node.js',
            totalEnrollments: 1,
            averageRating: 4.5,
            totalReviews: 2,
            level: 'Advanced',
            publicationState: 'Active'
        }
    ];

    const mockEnrollmentsC1 = [
        {
            _id: 'en1',
            studentRef: {
                _id: 's1',
                fullName: 'Addisu Guche',
                accountEmail: 'nurilignie@gmail.com',
                avatarUrl: ''
            },
            courseRef: {
                _id: 'c1',
                courseTitle: 'React Mastery'
            },
            completionPercentage: 85,
            tuitionClearanceFlag: true,
            lastActivityAt: new Date(Date.now() - 3600000).toISOString(),
            totalWatchMinutes: 120
        },
        {
            _id: 'en2',
            studentRef: {
                _id: 's2',
                fullName: 'Asamn Agiz',
                accountEmail: 'asamnagiz2@gmail.com',
                avatarUrl: ''
            },
            courseRef: {
                _id: 'c1',
                courseTitle: 'React Mastery'
            },
            completionPercentage: 100,
            tuitionClearanceFlag: true,
            lastActivityAt: new Date(Date.now() - 86400000).toISOString(),
            totalWatchMinutes: 240
        }
    ];

    const mockEnrollmentsC2 = [
        {
            _id: 'en3',
            studentRef: {
                _id: 's3',
                fullName: 'Bob Smith',
                accountEmail: 'bob@example.com',
                avatarUrl: ''
            },
            courseRef: {
                _id: 'c2',
                courseTitle: 'Advanced Node.js'
            },
            completionPercentage: 10,
            tuitionClearanceFlag: false,
            lastActivityAt: new Date(Date.now() - 172800000).toISOString(),
            totalWatchMinutes: 15
        }
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        courseService.getInstructorCourses.mockResolvedValue({ data: { data: mockCourses } });
        gradebookService.getSubmissionsForCourse.mockResolvedValue({ data: { data: [] } });
        assignmentService.getByCourse.mockResolvedValue({ data: { data: [] } });
    });

    it('renders courses and auto-selects the first course with its enrolled students', async () => {
        enrollmentService.getAll.mockResolvedValue({ data: { data: mockEnrollmentsC1 } });

        render(<StudentManagement courses={mockCourses} />);

        await waitFor(() => {
            expect(enrollmentService.getAll).toHaveBeenCalledWith({ courseId: 'c1' });
        });

        // Verify students appear in the document
        expect(await screen.findByText('Addisu Guche')).toBeInTheDocument();
        expect(screen.getByText('Asamn Agiz')).toBeInTheDocument();
        expect(screen.getByText('nurilignie@gmail.com')).toBeInTheDocument();
        expect(screen.getByText('asamnagiz2@gmail.com')).toBeInTheDocument();

        // Verify statistics
        expect(screen.getByText('2 of 2 students')).toBeInTheDocument();
    });

    it('filters students when searching by name or email', async () => {
        enrollmentService.getAll.mockResolvedValue({ data: { data: mockEnrollmentsC1 } });

        render(<StudentManagement courses={mockCourses} />);

        await waitFor(() => {
            expect(screen.getByText('Addisu Guche')).toBeInTheDocument();
        });

        const searchInput = screen.getByPlaceholderText('Search students by name or email…');
        fireEvent.change(searchInput, { target: { value: 'Addisu' } });

        expect(screen.getByText('Addisu Guche')).toBeInTheDocument();
        expect(screen.queryByText('Asamn Agiz')).not.toBeInTheDocument();
        expect(screen.getByText('1 of 2 students')).toBeInTheDocument();
    });

    it('switches course and loads enrollments for the new course', async () => {
        enrollmentService.getAll.mockImplementation(({ courseId }) => {
            if (courseId === 'c1') return Promise.resolve({ data: { data: mockEnrollmentsC1 } });
            if (courseId === 'c2') return Promise.resolve({ data: { data: mockEnrollmentsC2 } });
            return Promise.resolve({ data: { data: [] } });
        });

        render(<StudentManagement courses={mockCourses} />);

        await waitFor(() => {
            expect(screen.getByText('Addisu Guche')).toBeInTheDocument();
        });

        const courseSelect = screen.getByLabelText('Select course');
        fireEvent.change(courseSelect, { target: { value: 'c2' } });

        await waitFor(() => {
            expect(enrollmentService.getAll).toHaveBeenCalledWith({ courseId: 'c2' });
        });

        expect(await screen.findByText('Bob Smith')).toBeInTheDocument();
        expect(screen.queryByText('Addisu Guche')).not.toBeInTheDocument();
    });

    it('renders error banner when enrollment fetch fails', async () => {
        enrollmentService.getAll.mockRejectedValue({
            response: { data: { message: 'Failed to authenticate instructor' } }
        });

        render(<StudentManagement courses={mockCourses} />);

        await waitFor(() => {
            expect(screen.getByText('Failed to authenticate instructor')).toBeInTheDocument();
        });

        expect(screen.getByText('Retry')).toBeInTheDocument();
    });
});
