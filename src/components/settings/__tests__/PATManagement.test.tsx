// TypeScript test fixes applied
import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { useSession } from 'next-auth/react';
import { PATManagement } from '../PATManagement';

// Mock next-auth
jest.mock('next-auth/react');
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;

// Mock fetch globally
global.fetch = jest.fn();
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn().mockResolvedValue(undefined),
  },
});

// Mock date-fns
jest.mock('date-fns', () => ({
  format: jest.fn((date) => {
    if (typeof date === 'string') {
      return new Date(date).toISOString().split('T')[0];
    }
    return date.toISOString().split('T')[0];
  }),
}));

describe('PATManagement', () => {
  const mockSession = {
    user: {
      email: 'test@example.com',
      name: 'Test User',
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  },
  };

  const mockTokens = [
    {
      id: 'token-1',
      name: 'Test Token 1',
      createdAt: '2024-01-01T00:00:00.000Z',
      lastUsedAt: '2024-01-15T00:00:00.000Z',
      expiresAt: null,
    },
    {
      id: 'token-2',
      name: 'Test Token 2',
      createdAt: '2024-01-02T00:00:00.000Z',
      lastUsedAt: null,
      expiresAt: '2024-12-31T00:00:00.000Z',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSession.mockReturnValue({
      data: mockSession,
      status: 'authenticated',
      update: jest.fn(),
    });
    
    mockFetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ tokens: mockTokens }),
    } as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should render token management interface', async () => {
    await act(async () => {
      render(<PATManagement />);
    });

    expect(screen.getByText('Personal access tokens function like ordinary OAuth access tokens. They can be used to authenticate to the API over HTTP.')).toBeInTheDocument();
    expect(screen.getByText('New Token')).toBeInTheDocument();
  });

  it('should fetch and display tokens on mount', async () => {
    await act(async () => {
      render(<PATManagement />);
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/auth/tokens');
    });

    await waitFor(() => {
      expect(screen.getByText('Test Token 1')).toBeInTheDocument();
      expect(screen.getByText('Test Token 2')).toBeInTheDocument();
    });
  });

  it('should show loading state initially', async () => {
    // Mock a pending fetch
    mockFetch.mockReturnValue(new Promise(() => {}));
    
    await act(async () => {
      render(<PATManagement />);
    });
    
    // Loading component shows a spinner, not text
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('should handle fetch error gracefully', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await act(async () => {
      render(<PATManagement />);
    });

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Error fetching tokens:', expect.any(Error));
    });

    consoleSpy.mockRestore();
  });

  it('should handle session loading state', async () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'loading',
      update: jest.fn(),
    });

    await act(async () => {
      render(<PATManagement />);
    });

    // Component should handle loading gracefully - shows spinner
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('should not fetch tokens when no session', async () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated',
      update: jest.fn(),
    });

    await act(async () => {
      render(<PATManagement />);
    });

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should display token information correctly', async () => {
    await act(async () => {
      render(<PATManagement />);
    });

    await waitFor(() => {
      expect(screen.getByText('Test Token 1')).toBeInTheDocument();
      expect(screen.getByText('Test Token 2')).toBeInTheDocument();
    });

    // Check that format function was called for dates
    const formatMock = require('date-fns').format;
    expect(formatMock).toHaveBeenCalled();
  });

  it('should show appropriate UI elements for tokens', async () => {
    await act(async () => {
      render(<PATManagement />);
    });

    await waitFor(() => {
      expect(screen.getByText('Test Token 1')).toBeInTheDocument();
    });

    // Should have delete buttons for tokens (they have Trash2 icons)
    const deleteButtons = screen.getAllByRole('button').filter(btn => 
      btn.querySelector('svg')
    );
    expect(deleteButtons.length).toBeGreaterThan(0);

    // Should have Claude Code setup button
    expect(screen.getByText('Claude Code Setup')).toBeInTheDocument();
  });
});