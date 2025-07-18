import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { 
  generateSecureToken, 
  hashToken, 
  validatePersonalAccessToken, 
  createPersonalAccessToken, 
  revokePersonalAccessToken,
  listPersonalAccessTokens
} from '../pat.service';

// Mock the prisma import first
jest.mock('@/lib/prisma', () => ({
  prisma: {
    personalAccessToken: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  },
}));

// Import the mocked prisma
import { prisma } from '@/lib/prisma';
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('PAT Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateSecureToken', () => {
    it('should generate a token with correct prefix', () => {
      const token = generateSecureToken();
      expect(token).toMatch(/^maix_pat_[a-f0-9]{64}$/);
    });

    it('should generate unique tokens', () => {
      const token1 = generateSecureToken();
      const token2 = generateSecureToken();
      expect(token1).not.toBe(token2);
    });
  });

  describe('hashToken', () => {
    it('should hash a token consistently', () => {
      const token = 'test-token';
      const hash1 = hashToken(token);
      const hash2 = hashToken(token);
      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different tokens', () => {
      const hash1 = hashToken('token1');
      const hash2 = hashToken('token2');
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('validatePersonalAccessToken', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      isActive: true,
    };

    const mockToken = {
      id: 'pat-123',
      tokenHash: 'hashed-token',
      user: mockUser,
      expiresAt: null,
    };

    it('should return user for valid token', async () => {
      mockPrisma.personalAccessToken.findUnique.mockResolvedValue(mockToken);
      mockPrisma.personalAccessToken.update.mockResolvedValue(mockToken);

      const result = await validatePersonalAccessToken('test-token');
      expect(result).toEqual(mockUser);
    });

    it('should return null for invalid token', async () => {
      mockPrisma.personalAccessToken.findUnique.mockResolvedValue(null);

      const result = await validatePersonalAccessToken('invalid-token');
      expect(result).toBeNull();
    });

    it('should return null for expired token', async () => {
      const expiredToken = {
        ...mockToken,
        expiresAt: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
      };
      mockPrisma.personalAccessToken.findUnique.mockResolvedValue(expiredToken);

      const result = await validatePersonalAccessToken('expired-token');
      expect(result).toBeNull();
    });

    it('should update lastUsedAt for valid token', async () => {
      mockPrisma.personalAccessToken.findUnique.mockResolvedValue(mockToken);
      mockPrisma.personalAccessToken.update.mockResolvedValue(mockToken);

      await validatePersonalAccessToken('test-token');
      
      expect(mockPrisma.personalAccessToken.update).toHaveBeenCalledWith({
        where: { id: 'pat-123' },
        data: { lastUsedAt: expect.any(Date) },
      });
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.personalAccessToken.findUnique.mockRejectedValue(new Error('DB Error'));

      const result = await validatePersonalAccessToken('test-token');
      expect(result).toBeNull();
    });
  });

  describe('createPersonalAccessToken', () => {
    const mockTokenRecord = {
      id: 'pat-123',
      name: 'Test Token',
      tokenHash: 'hashed-token',
      userId: 'user-123',
      createdAt: new Date(),
      expiresAt: null,
      user: { id: 'user-123', email: 'test@example.com' },
    };

    it('should create a new token successfully', async () => {
      mockPrisma.personalAccessToken.create.mockResolvedValue(mockTokenRecord);

      const result = await createPersonalAccessToken('user-123', 'Test Token');
      
      expect(result.token).toMatch(/^maix_pat_[a-f0-9]{64}$/);
      expect(result.tokenRecord).toEqual(mockTokenRecord);
      expect(mockPrisma.personalAccessToken.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-123',
          name: 'Test Token',
          tokenHash: expect.any(String),
          expiresAt: undefined,
        },
        include: { user: true },
      });
    });

    it('should create a token with expiration', async () => {
      const expirationDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30); // 30 days
      mockPrisma.personalAccessToken.create.mockResolvedValue(mockTokenRecord);

      await createPersonalAccessToken('user-123', 'Test Token', expirationDate);
      
      expect(mockPrisma.personalAccessToken.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-123',
          name: 'Test Token',
          tokenHash: expect.any(String),
          expiresAt: expirationDate,
        },
        include: { user: true },
      });
    });
  });

  describe('revokePersonalAccessToken', () => {
    it('should revoke token successfully', async () => {
      mockPrisma.personalAccessToken.delete.mockResolvedValue({});

      const result = await revokePersonalAccessToken('pat-123', 'user-123');
      
      expect(result).toBe(true);
      expect(mockPrisma.personalAccessToken.delete).toHaveBeenCalledWith({
        where: { id: 'pat-123', userId: 'user-123' },
      });
    });

    it('should return false for non-existent token', async () => {
      mockPrisma.personalAccessToken.delete.mockRejectedValue(new Error('Not found'));

      const result = await revokePersonalAccessToken('invalid-id', 'user-123');
      expect(result).toBe(false);
    });
  });

  describe('listPersonalAccessTokens', () => {
    const mockTokens = [
      {
        id: 'pat-1',
        name: 'Token 1',
        createdAt: new Date(),
        lastUsedAt: new Date(),
        expiresAt: null,
      },
      {
        id: 'pat-2',
        name: 'Token 2',
        createdAt: new Date(),
        lastUsedAt: null,
        expiresAt: new Date(),
      },
    ];

    it('should list user tokens', async () => {
      mockPrisma.personalAccessToken.findMany.mockResolvedValue(mockTokens);

      const result = await listPersonalAccessTokens('user-123');
      
      expect(result).toEqual(mockTokens);
      expect(mockPrisma.personalAccessToken.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        select: {
          id: true,
          name: true,
          createdAt: true,
          lastUsedAt: true,
          expiresAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    });
  });
});