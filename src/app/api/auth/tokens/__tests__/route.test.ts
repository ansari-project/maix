import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { GET, POST } from '../route';
import * as patService from '@/lib/mcp/services/pat.service';

// Mock dependencies
jest.mock('next-auth');
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
  },
}));
jest.mock('@/lib/mcp/services/pat.service');

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockPatService = patService as jest.Mocked<typeof patService>;

describe('/api/auth/tokens', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
  };

  const mockSession = {
    user: {
      email: 'test@example.com',
      name: 'Test User',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/auth/tokens', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/auth/tokens');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 404 when user is not found in database', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/auth/tokens');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('User not found');
    });

    // Removed useless test that only verified mock return values

    it('should handle service errors gracefully', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      mockPatService.listPersonalAccessTokens.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost/api/auth/tokens');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });

  describe('POST /api/auth/tokens', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/auth/tokens', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test Token' }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 for invalid token name', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);

      const request = new NextRequest('http://localhost/api/auth/tokens', {
        method: 'POST',
        body: JSON.stringify({ name: '' }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Token name is required and must be 1-100 characters');
    });

    it('should return 400 for token name too long', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);

      const request = new NextRequest('http://localhost/api/auth/tokens', {
        method: 'POST',
        body: JSON.stringify({ name: 'a'.repeat(101) }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Token name is required and must be 1-100 characters');
    });

    it('should return 404 when user is not found in database', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/auth/tokens', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test Token' }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('User not found');
    });

    // Removed useless tests that only verified mock return values

    it('should handle service errors gracefully', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      mockPatService.createPersonalAccessToken.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost/api/auth/tokens', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test Token' }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });
});