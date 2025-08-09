import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { createHash } from 'crypto';
import {
  generateInvitationToken,
  hashInvitationToken,
  getDefaultExpiration,
  generateInvitationUrl,
  isEmailAlreadyInvited,
  validateInvitationToken,
  cleanupExpiredInvitations
} from '../invitation-utils';
import { prisma } from '../prisma';

// Mock prisma
jest.mock('../prisma', () => ({
  prisma: {
    invitation: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      deleteMany: jest.fn(),
    },
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
    const originalEnv = process.env.NEXT_PUBLIC_APP_URL;

    beforeEach(() => {
      process.env.NEXT_PUBLIC_APP_URL = 'https://maix.io';
    });

    afterEach(() => {
      process.env.NEXT_PUBLIC_APP_URL = originalEnv;
    });

    it('should generate correct URL with default base URL', () => {
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

    it('should handle missing environment variable', () => {
      delete process.env.NEXT_PUBLIC_APP_URL;
      const token = 'c'.repeat(64);
      
      const url = generateInvitationUrl(token);
      
      expect(url).toBe(`http://localhost:3000/accept-invitation?token=${token}`);
    });
  });

  describe('isEmailAlreadyInvited', () => {
    it('should return true if email has pending invitation for entity', async () => {
      mockPrisma.invitation.findFirst.mockResolvedValue({
        id: 'invitation-1',
        email: 'test@example.com',
        status: 'PENDING',
        hashedToken: 'hashed',
        role: 'MEMBER',
        message: null,
        expiresAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        acceptedAt: null,
        inviterId: 'user-1',
        organizationId: 'org-1',
        productId: null,
        projectId: null
      });

      const result = await isEmailAlreadyInvited('test@example.com', 'org-1');

      expect(result).toBe(true);
      expect(prisma.invitation.findFirst).toHaveBeenCalledWith({
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
      expect(prisma.invitation.findUnique).toHaveBeenCalledWith({
        where: { hashedToken: hashInvitationToken(token) },
        include: expect.any(Object)
      });
    });

    it('should return EXPIRED for expired invitation', async () => {
      const mockInvitation = {
        id: 'invitation-1',
        hashedToken: 'hashed',
        email: 'test@example.com',
        status: 'PENDING' as const,
        role: 'MEMBER' as const,
        message: null,
        expiresAt: new Date(Date.now() - 1000), // 1 second ago
        createdAt: new Date(),
        updatedAt: new Date(),
        acceptedAt: null,
        inviterId: 'user-1',
        organizationId: 'org-1',
        productId: null,
        projectId: null,
        inviter: { id: 'user-1', name: 'Inviter', email: 'inviter@example.com' },
        organization: { id: 'org-1', name: 'Test Org', slug: 'test-org' },
        product: null,
        project: null,
        organizationMember: [],
        productMember: [],
        projectMember: []
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
        hashedToken: 'hashed',
        email: 'test@example.com',
        status: 'ACCEPTED' as const,
        role: 'MEMBER' as const,
        message: null,
        expiresAt: new Date(Date.now() + 86400000), // 1 day from now
        createdAt: new Date(),
        updatedAt: new Date(),
        acceptedAt: new Date(),
        inviterId: 'user-1',
        organizationId: 'org-1',
        productId: null,
        projectId: null,
        inviter: { id: 'user-1', name: 'Inviter', email: 'inviter@example.com' },
        organization: { id: 'org-1', name: 'Test Org', slug: 'test-org' },
        product: null,
        project: null,
        organizationMember: [],
        productMember: [],
        projectMember: []
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
        hashedToken: 'hashed',
        email: 'test@example.com',
        status: 'PENDING' as const,
        role: 'MEMBER' as const,
        message: null,
        expiresAt: new Date(Date.now() + 86400000), // 1 day from now
        createdAt: new Date(),
        updatedAt: new Date(),
        acceptedAt: null,
        inviterId: 'user-1',
        organizationId: 'org-1',
        productId: null,
        projectId: null,
        inviter: { id: 'user-1', name: 'Inviter', email: 'inviter@example.com' },
        organization: { id: 'org-1', name: 'Test Org', slug: 'test-org' },
        product: null,
        project: null,
        organizationMember: [],
        productMember: [],
        projectMember: []
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

  describe('cleanupExpiredInvitations', () => {
    it('should delete expired pending invitations', async () => {
      mockPrisma.invitation.deleteMany.mockResolvedValue({ count: 5 });

      const result = await cleanupExpiredInvitations();

      expect(result).toBe(5);
      expect(prisma.invitation.deleteMany).toHaveBeenCalledWith({
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