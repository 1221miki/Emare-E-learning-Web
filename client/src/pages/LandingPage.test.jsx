import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LandingPage from './LandingPage';

vi.mock('../components/Navbar', () => ({
  default: () => <div>Navbar</div>,
}));

vi.mock('../context/ThemeContext', () => ({
  useTheme: () => ({
    theme: 'light',
    colors: {
      bg: '#ffffff',
      bgCard: '#f8fafc',
      bgInput: '#eef2ff',
      primary: '#2563eb',
      accent: '#7c3aed',
      text: '#111827',
      textMuted: '#64748b',
      border: '#e2e8f0',
    },
  }),
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: null, isAuthenticated: false }),
}));

vi.mock('../services/api.jsx', () => ({
  courseService: { getAll: vi.fn().mockResolvedValue({ data: { data: [] } }) },
  subscriptionService: {
    getStatus: vi.fn().mockResolvedValue({ data: {} }),
    checkEmailStatus: vi.fn(),
    subscribeForDiscount: vi.fn(),
  },
  userService: { getPublicStats: vi.fn().mockResolvedValue({ data: { data: {} } }) },
  liveSessionService: { reserveSeat: vi.fn() },
}));

beforeEach(() => {
  Object.defineProperty(HTMLMediaElement.prototype, 'play', {
    configurable: true,
    value: vi.fn().mockResolvedValue(undefined),
  });
  Object.defineProperty(HTMLMediaElement.prototype, 'pause', {
    configurable: true,
    value: vi.fn(),
  });
});

describe('LandingPage hero video', () => {
  it('starts paused and only plays when the user clicks the play button', async () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    );

    const video = document.querySelector('video');
    expect(video).not.toBeNull();
    expect(video).not.toHaveAttribute('autoplay');
    expect(video).not.toHaveAttribute('loop');
    expect(screen.getByTitle('Play')).toBeInTheDocument();

    fireEvent.click(screen.getByTitle('Play'));

    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(1);
  });
});
