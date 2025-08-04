import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { createHash } from 'crypto';
import {
  generateInvitationToken,
  hashInvitationToken,
  getDefaultExpiration,
  generateInvitationUrl,
  isEmailAlreadyInvited,
  validateInvitationToken,
  redeemInvitationToken,
  cleanupExpiredInvitations
} from '../invitation-utils';
import { prisma } from '../prisma';

// Mock Prisma
jest.mock('../prisma', () => ({
  prisma: {
    invitation: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    organizationMember: {
      create: jest.fn(),
    },
    productMember: {
      create: jest.fn(),
    },
    projectMember: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('invitation-utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateInvitationToken', () => {
    it('should generate a 64-character hex token', () => {
      const token = generateInvitationToken();
      
      expect(token).toHaveLength(64);
      expect(token).toMatch(/^[0-9a-f]+$/i);
    });

    it('should generate unique tokens', () => {
      const token1 = generateInvitationToken();
      const token2 = generateInvitationToken();
      
      expect(token1).not.toBe(token2);
    });
  });

  describe('hashInvitationToken', () => {
    it('should hash a token using SHA-256', () => {
      const token = 'a'.repeat(64);
      const hash = hashInvitationToken(token);
      
      // Expected SHA-256 hash of 64 'a' characters
      const expectedHash = createHash('sha256').update(token).digest('hex');
      expect(hash).toBe(expectedHash);
      expect(hash).toHaveLength(64);
    });

    it('should produce different hashes for different tokens', () => {
      const token1 = 'a'.repeat(64);
      const token2 = 'b'.repeat(64);
      
      const hash1 = hashInvitationToken(token1);
      const hash2 = hashInvitationToken(token2);
      
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('getDefaultExpiration', () => {
    it('should return a date 7 days in the future', () => {
      const now = new Date();
      const expiration = getDefaultExpiration();
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() + 7);
      
      // Allow for small timing differences
      expect(Math.abs(expiration.getTime() - expectedDate.getTime())).toBeLessThan(1000);
    });
  });

  describe('generateInvitationUrl', () => {
    const originalEnv = process.env.NEXT_PUBLIC_URL;

    afterEach(() => {
      process.env.NEXT_PUBLIC_URL = originalEnv;
    });

    it('should generate correct URL with default base URL', () => {
      process.env.NEXT_PUBLIC_URL = 'https://maix.io';
      const token = 'a'.repeat(64);
      
      const url = generateInvitationUrl(token);
      
      expect(url).toBe(`https://maix.io/accept-invitation?token=${token}`);
    });

    it('should generate correct URL with custom base URL', () => {
      const token = 'b'.repeat(64);
      const baseUrl = 'https://custom.example.com';
      
      const url = generateInvitationUrl(token, baseUrl);
      
      expect(url).toBe(`${baseUrl}/accept-invitation?token=${token}`);
    });
  });

  describe('isEmailAlreadyInvited', () => {
    it('should return true if email has pending invitation for entity', async () => {
      mockPrisma.invitation.findFirst.mockResolvedValue({
        id: 'invitation-1',
        email: 'test@example.com',
        status: 'PENDING'
      });

      const result = await isEmailAlreadyInvited('test@example.com', 'org-1');

      expect(result).toBe(true);
      expect(mockPrisma.invitation.findFirst).toHaveBeenCalledWith({
        where: {
          email: 'test@example.com',
          status: 'PENDING',
          OR: [
            { organizationId: 'org-1' },
            { productId: 'org-1' },
            { projectId: 'org-1' }
          ]
        }
      });
    });

    it('should return false if no pending invitation exists', async () => {
      mockPrisma.invitation.findFirst.mockResolvedValue(null);

      const result = await isEmailAlreadyInvited('test@example.com', 'org-1');

      expect(result).toBe(false);
    });
  });

  describe('validateInvitationToken', () => {
    it('should return INVALID_FORMAT for malformed tokens', async () => {
      const testCases = [
        '', // empty
        'short', // too short
        'a'.repeat(65), // too long
        'g'.repeat(64), // invalid hex character
      ];

      for (const token of testCases) {
        const result = await validateInvitationToken(token);
        expect(result).toEqual({
          valid: false,
          error: 'INVALID_FORMAT'
        });
      }
    });

    it('should return NOT_FOUND for non-existent token', async () => {
      mockPrisma.invitation.findUnique.mockResolvedValue(null);
      
      const token = 'a'.repeat(64);
      const result = await validateInvitationToken(token);

      expect(result).toEqual({
        valid: false,
        error: 'NOT_FOUND'
      });
      expect(mockPrisma.invitation.findUnique).toHaveBeenCalledWith({
        where: { hashedToken: hashInvitationToken(token) },
        include: expect.any(Object)
      });
    });

    it('should return EXPIRED for expired invitation', async () => {
      const mockInvitation = {
        id: 'invitation-1',
        email: 'test@example.com',
        status: 'PENDING',
        expiresAt: new Date(Date.now() - 1000), // 1 second ago
        inviter: { id: 'user-1', name: 'Inviter', email: 'inviter@example.com' }
      };
      
      mockPrisma.invitation.findUnique.mockResolvedValue(mockInvitation);

      const token = 'a'.repeat(64);
      const result = await validateInvitationToken(token);

      expect(result).toEqual({
        valid: false,
        error: 'EXPIRED',
        invitation: mockInvitation
      });
    });

    it('should return ALREADY_PROCESSED for non-pending invitation', async () => {
      const mockInvitation = {
        id: 'invitation-1',
        email: 'test@example.com',
        status: 'ACCEPTED',
        expiresAt: new Date(Date.now() + 86400000), // 1 day from now
        inviter: { id: 'user-1', name: 'Inviter', email: 'inviter@example.com' }
      };
      
      mockPrisma.invitation.findUnique.mockResolvedValue(mockInvitation);

      const token = 'a'.repeat(64);
      const result = await validateInvitationToken(token);

      expect(result).toEqual({
        valid: false,
        error: 'ALREADY_PROCESSED',
        invitation: mockInvitation
      });
    });

    it('should return valid result for valid pending invitation', async () => {
      const mockInvitation = {
        id: 'invitation-1',
        email: 'test@example.com',
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 86400000), // 1 day from now
        inviter: { id: 'user-1', name: 'Inviter', email: 'inviter@example.com' },
        organization: { id: 'org-1', name: 'Test Org', slug: 'test-org' }
      };
      
      mockPrisma.invitation.findUnique.mockResolvedValue(mockInvitation);

      const token = 'a'.repeat(64);
      const result = await validateInvitationToken(token);

      expect(result).toEqual({
        valid: true,
        invitation: mockInvitation
      });
    });
  });

  describe('redeemInvitationToken', () => {
    it('should successfully redeem organization invitation', async () => {
      const mockInvitation = {
        id: 'invitation-1',
        organizationId: 'org-1',
        productId: null,
        projectId: null,
        role: 'MEMBER',
        organization: { id: 'org-1', name: 'Test Org' }
      };

      const mockMembership = {
        id: 'member-1',
        userId: 'user-1',
        organizationId: 'org-1',
        role: 'MEMBER'
      };

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        // Mock the transaction callback
        const mockTx = {
          invitation: {
            updateMany: jest.fn().mockResolvedValue({ count: 1 }),
            findUnique: jest.fn().mockResolvedValue(mockInvitation)
          },
          organizationMember: {
            create: jest.fn().mockResolvedValue(mockMembership)
          }
        };
        
        return await callback(mockTx);
      });

      const token = 'a'.repeat(64);
      const result = await redeemInvitationToken(token, 'user-1');

      expect(result).toEqual({
        success: true,
        membership: mockMembership
      });
    });

    it('should handle invalid or expired token', async () => {
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const mockTx = {
          invitation: {
            updateMany: jest.fn().mockResolvedValue({ count: 0 })
          }
        };
        
        return await callback(mockTx);
      });

      const token = 'a'.repeat(64);
      const result = await redeemInvitationToken(token, 'user-1');

      expect(result).toEqual({
        success: false,
        error: 'INVALID_OR_EXPIRED'
      });
    });

    it('should handle redemption errors', async () => {
      mockPrisma.$transaction.mockRejectedValue(new Error('Database error'));

      const token = 'a'.repeat(64);
      const result = await redeemInvitationToken(token, 'user-1');

      expect(result).toEqual({
        success: false,
        error: 'REDEMPTION_FAILED'
      });
    });
  });

  describe('cleanupExpiredInvitations', () => {
    it('should delete expired pending invitations', async () => {
      mockPrisma.invitation.deleteMany.mockResolvedValue({ count: 5 });

      const result = await cleanupExpiredInvitations();

      expect(result).toBe(5);
      expect(mockPrisma.invitation.deleteMany).toHaveBeenCalledWith({
        where: {
          status: 'PENDING',
          expiresAt: { lt: expect.any(Date) }
        }
      });
    });

    it('should return 0 when no expired invitations exist', async () => {
      mockPrisma.invitation.deleteMany.mockResolvedValue({ count: 0 });

      const result = await cleanupExpiredInvitations();

      expect(result).toBe(0);
    });
  });
});