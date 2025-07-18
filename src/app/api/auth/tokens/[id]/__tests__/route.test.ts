import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { DELETE } from '../route';
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
const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockPatService = patService as jest.Mocked<typeof patService>;

describe('/api/auth/tokens/[id]', () => {
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

  describe('DELETE /api/auth/tokens/[id]', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/auth/tokens/token-1', {
        method: 'DELETE',
      });
      const response = await DELETE(request, { params: { id: 'token-1' } });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 when token ID is missing', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);

      const request = new NextRequest('http://localhost/api/auth/tokens/', {
        method: 'DELETE',
      });
      const response = await DELETE(request, { params: { id: '' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Token ID is required');
    });

    it('should return 404 when user is not found in database', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/auth/tokens/token-1', {
        method: 'DELETE',
      });
      const response = await DELETE(request, { params: { id: 'token-1' } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('User not found');
    });

    it('should return 404 when token is not found or not owned by user', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPatService.revokePersonalAccessToken.mockResolvedValue(false);

      const request = new NextRequest('http://localhost/api/auth/tokens/token-1', {
        method: 'DELETE',
      });
      const response = await DELETE(request, { params: { id: 'token-1' } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Token not found or already revoked');
      expect(mockPatService.revokePersonalAccessToken).toHaveBeenCalledWith('token-1', 'user-123');
    });

    it('should successfully revoke token', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPatService.revokePersonalAccessToken.mockResolvedValue(true);

      const request = new NextRequest('http://localhost/api/auth/tokens/token-1', {
        method: 'DELETE',
      });
      const response = await DELETE(request, { params: { id: 'token-1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Token revoked successfully');
      expect(mockPatService.revokePersonalAccessToken).toHaveBeenCalledWith('token-1', 'user-123');
    });

    it('should handle service errors gracefully', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPatService.revokePersonalAccessToken.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost/api/auth/tokens/token-1', {
        method: 'DELETE',
      });
      const response = await DELETE(request, { params: { id: 'token-1' } });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });
});