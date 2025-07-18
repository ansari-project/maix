import { createHash } from 'crypto';
import { prisma } from '@/lib/prisma';
import {
  generateSecureToken,
  hashToken,
  validatePersonalAccessToken,
  createPersonalAccessToken,
  revokePersonalAccessToken,
  listPersonalAccessTokens,
} from '../pat.service';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    personalAccessToken: {
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('PAT Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear console.error mock if it exists
    if (jest.isMockFunction(console.error)) {
      (console.error as jest.Mock).mockClear();
    } else {
      jest.spyOn(console, 'error').mockImplementation(() => {});
    }
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('generateSecureToken', () => {
    it('should generate a token with correct prefix and format', () => {
      const token = generateSecureToken();
      
      expect(token).toMatch(/^maix_pat_[a-f0-9]{64}$/);
      expect(token.length).toBe(73); // 'maix_pat_' (9) + 64 hex characters
    });

    it('should generate unique tokens', () => {
      const token1 = generateSecureToken();
      const token2 = generateSecureToken();
      
      expect(token1).not.toBe(token2);
    });
  });

  describe('hashToken', () => {
    it('should generate consistent SHA-256 hash', () => {
      const token = 'maix_pat_test123';
      const hash1 = hashToken(token);
      const hash2 = hashToken(token);
      
      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/); // SHA-256 produces 64 character hex
    });

    it('should generate different hashes for different tokens', () => {
      const token1 = 'maix_pat_test123';
      const token2 = 'maix_pat_test456';
      
      const hash1 = hashToken(token1);
      const hash2 = hashToken(token2);
      
      expect(hash1).not.toBe(hash2);
    });

    it('should match Node.js crypto hash implementation', () => {
      const token = 'maix_pat_test123';
      const expectedHash = createHash('sha256').update(token).digest('hex');
      
      expect(hashToken(token)).toBe(expectedHash);
    });
  });

  describe('validatePersonalAccessToken', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
    };

    const mockPAT = {
      id: 'token-123',
      userId: 'user-123',
      tokenHash: 'hash123',
      expiresAt: null,
      user: mockUser,
    };

    it('should return null for non-existent token', async () => {
      const token = 'maix_pat_invalid';
      mockPrisma.personalAccessToken.findUnique.mockResolvedValue(null);

      const result = await validatePersonalAccessToken(token);

      expect(result).toBeNull();
      expect(mockPrisma.personalAccessToken.findUnique).toHaveBeenCalledWith({
        where: { tokenHash: hashToken(token) },
        include: { user: true },
      });
    });

    it('should return null for expired token', async () => {
      const token = 'maix_pat_expired';
      const expiredPAT = {
        ...mockPAT,
        expiresAt: new Date('2020-01-01'), // Past date
      };
      
      mockPrisma.personalAccessToken.findUnique.mockResolvedValue(expiredPAT);

      const result = await validatePersonalAccessToken(token);

      expect(result).toBeNull();
    });

    it('should return user for valid token', async () => {
      const token = 'maix_pat_valid';
      mockPrisma.personalAccessToken.findUnique.mockResolvedValue(mockPAT);
      mockPrisma.personalAccessToken.update.mockResolvedValue({} as any);

      const result = await validatePersonalAccessToken(token);

      expect(result).toEqual(mockUser);
      expect(mockPrisma.personalAccessToken.update).toHaveBeenCalledWith({
        where: { id: 'token-123' },
        data: { lastUsedAt: expect.any(Date) },
      });
    });

    it('should return user for token with future expiration', async () => {
      const token = 'maix_pat_future';
      const futurePAT = {
        ...mockPAT,
        expiresAt: new Date('2030-01-01'), // Future date
      };
      
      mockPrisma.personalAccessToken.findUnique.mockResolvedValue(futurePAT);
      mockPrisma.personalAccessToken.update.mockResolvedValue({} as any);

      const result = await validatePersonalAccessToken(token);

      expect(result).toEqual(mockUser);
    });

    it('should handle database errors gracefully', async () => {
      const token = 'maix_pat_error';
      mockPrisma.personalAccessToken.findUnique.mockRejectedValue(new Error('DB Error'));

      const result = await validatePersonalAccessToken(token);

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith('Error validating PAT:', expect.any(Error));
    });

    it('should handle lastUsedAt update failure gracefully', async () => {
      const token = 'maix_pat_update_fail';
      mockPrisma.personalAccessToken.findUnique.mockResolvedValue(mockPAT);
      mockPrisma.personalAccessToken.update.mockRejectedValue(new Error('Update failed'));

      const result = await validatePersonalAccessToken(token);

      expect(result).toEqual(mockUser);
      // Should continue despite update failure
    });
  });

  describe('createPersonalAccessToken', () => {
    const mockTokenRecord = {
      id: 'token-123',
      userId: 'user-123',
      name: 'Test Token',
      tokenHash: 'hash123',
      expiresAt: null,
      createdAt: new Date(),
      user: {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
      },
    };

    it('should create token without expiration', async () => {
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

    it('should create token with expiration', async () => {
      const expirationDate = new Date('2024-12-31');
      const tokenRecordWithExpiry = {
        ...mockTokenRecord,
        expiresAt: expirationDate,
      };
      
      mockPrisma.personalAccessToken.create.mockResolvedValue(tokenRecordWithExpiry);

      const result = await createPersonalAccessToken('user-123', 'Test Token', expirationDate);

      expect(result.token).toMatch(/^maix_pat_[a-f0-9]{64}$/);
      expect(result.tokenRecord).toEqual(tokenRecordWithExpiry);
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

    it('should generate correct token hash', async () => {
      mockPrisma.personalAccessToken.create.mockResolvedValue(mockTokenRecord);

      const result = await createPersonalAccessToken('user-123', 'Test Token');

      // Verify that the hash of the returned token matches what was stored
      const expectedHash = hashToken(result.token);
      const createCall = mockPrisma.personalAccessToken.create.mock.calls[0][0];
      expect(createCall.data.tokenHash).toBe(expectedHash);
    });
  });

  describe('revokePersonalAccessToken', () => {
    it('should successfully revoke token', async () => {
      mockPrisma.personalAccessToken.delete.mockResolvedValue({} as any);

      const result = await revokePersonalAccessToken('token-123', 'user-123');

      expect(result).toBe(true);
      expect(mockPrisma.personalAccessToken.delete).toHaveBeenCalledWith({
        where: {
          id: 'token-123',
          userId: 'user-123',
        },
      });
    });

    it('should return false on database error', async () => {
      mockPrisma.personalAccessToken.delete.mockRejectedValue(new Error('Not found'));

      const result = await revokePersonalAccessToken('token-123', 'user-123');

      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalledWith('Failed to revoke PAT:', expect.any(Error));
    });

    it('should only allow users to revoke their own tokens', async () => {
      mockPrisma.personalAccessToken.delete.mockResolvedValue({} as any);

      await revokePersonalAccessToken('token-123', 'user-456');

      expect(mockPrisma.personalAccessToken.delete).toHaveBeenCalledWith({
        where: {
          id: 'token-123',
          userId: 'user-456', // Should use the provided userId
        },
      });
    });
  });

  describe('listPersonalAccessTokens', () => {
    const mockTokens = [
      {
        id: 'token-1',
        name: 'Token 1',
        createdAt: new Date('2024-01-01'),
        lastUsedAt: new Date('2024-01-15'),
        expiresAt: null,
      },
      {
        id: 'token-2',
        name: 'Token 2',
        createdAt: new Date('2024-01-02'),
        lastUsedAt: null,
        expiresAt: new Date('2024-12-31'),
      },
    ];

    it('should list tokens for user', async () => {
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

    it('should not include tokenHash in response', async () => {
      mockPrisma.personalAccessToken.findMany.mockResolvedValue(mockTokens);

      await listPersonalAccessTokens('user-123');

      const selectClause = mockPrisma.personalAccessToken.findMany.mock.calls[0][0].select;
      expect(selectClause).not.toHaveProperty('tokenHash');
    });

    it('should order tokens by creation date descending', async () => {
      mockPrisma.personalAccessToken.findMany.mockResolvedValue(mockTokens);

      await listPersonalAccessTokens('user-123');

      const orderBy = mockPrisma.personalAccessToken.findMany.mock.calls[0][0].orderBy;
      expect(orderBy).toEqual({ createdAt: 'desc' });
    });
  });
});