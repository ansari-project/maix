/**
 * @jest-environment node
import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals'
 */

/**
 * Invitation Utils Integration Tests
 * 
 * 🗄️ INTEGRATION TEST - Uses REAL TEST DATABASE on port 5433
 * 
 * Prerequisites:
 *   ✅ Docker test database running (npm run test:db:start)
 *   ✅ .env.test configured with test database URL
 * 
 * This test:
 *   - Creates real invitations in test database
 *   - Tests actual database constraints and relationships
 *   - Validates token generation and hashing with real data
 *   - Verifies expiration and cleanup operations
 * 
 * Run with: npm run test:integration
 * Run safely with: npm run test:integration:safe (auto-starts DB)
 */

// Mock the prisma module to use test database
jest.mock('@/lib/prisma', () => ({
  prisma: require('@/lib/test/db-test-utils').prismaTest
}))

import { createHash } from 'crypto'
import {
  generateInvitationToken,
  hashInvitationToken,
  getDefaultExpiration,
  generateInvitationUrl,
  isEmailAlreadyInvited,
  validateInvitationToken,
  cleanupExpiredInvitations
} from '../invitation-utils'
import {
  setupTestDatabase,
  cleanupTestDatabase,
  createTestUser,
  prismaTest,
  disconnectDatabase
} from '@/lib/test/db-test-utils'

describe('Invitation Utils Integration Tests', () => {
  let testUser: any
  let testOrg: any
  let testProject: any
  let testProduct: any

  beforeAll(async () => {
    await setupTestDatabase()
  }, 30000)

  afterAll(async () => {
    await disconnectDatabase()
  })

  beforeEach(async () => {
    await cleanupTestDatabase()
    
    // Create test data
    testUser = await createTestUser({
      name: 'Test Inviter',
      email: 'inviter@example.com'
    })
    
    testOrg = await prismaTest.organization.create({
      data: {
        name: 'Test Organization',
        slug: 'test-org-' + Date.now(),
        description: 'Test organization for invitations',
        members: {
          create: {
            userId: testUser.id,
            role: 'OWNER'
          }
        }
      }
    })
    
    testProject = await prismaTest.project.create({
      data: {
        name: 'Test Project',
        description: 'Test project for invitations',
        ownerId: testUser.id,
        status: 'AWAITING_VOLUNTEERS'
      }
    })
    
    testProduct = await prismaTest.product.create({
      data: {
        name: 'Test Product',
        description: 'Test product for invitations',
        organizationId: testOrg.id,
        createdBy: testUser.id
      }
    })
  })

  describe('generateInvitationToken', () => {
    it('should generate a 64-character hex token', () => {
      const token = generateInvitationToken()
      
      expect(token).toHaveLength(64)
      expect(token).toMatch(/^[0-9a-f]+$/i)
    })

    it('should generate unique tokens', () => {
      const token1 = generateInvitationToken()
      const token2 = generateInvitationToken()
      
      expect(token1).not.toBe(token2)
    })
  })

  describe('hashInvitationToken', () => {
    it('should hash a token using SHA-256', () => {
      const token = 'a'.repeat(64)
      const hash = hashInvitationToken(token)
      
      // Expected SHA-256 hash of 64 'a' characters
      const expectedHash = createHash('sha256').update(token).digest('hex')
      expect(hash).toBe(expectedHash)
      expect(hash).toHaveLength(64)
    })

    it('should produce different hashes for different tokens', () => {
      const token1 = 'a'.repeat(64)
      const token2 = 'b'.repeat(64)
      
      const hash1 = hashInvitationToken(token1)
      const hash2 = hashInvitationToken(token2)
      
      expect(hash1).not.toBe(hash2)
    })
  })

  describe('getDefaultExpiration', () => {
    it('should return a date 7 days in the future', () => {
      const now = new Date()
      const expiration = getDefaultExpiration()
      const expectedDate = new Date()
      expectedDate.setDate(expectedDate.getDate() + 7)
      
      // Allow for small timing differences
      expect(Math.abs(expiration.getTime() - expectedDate.getTime())).toBeLessThan(1000)
    })
  })

  describe('generateInvitationUrl', () => {
    const originalEnv = process.env.NEXT_PUBLIC_APP_URL

    beforeEach(() => {
      process.env.NEXT_PUBLIC_APP_URL = 'https://maix.io'
    })

    afterEach(() => {
      process.env.NEXT_PUBLIC_APP_URL = originalEnv
    })

    it('should generate correct URL with default base URL', () => {
      const token = 'a'.repeat(64)
      
      const url = generateInvitationUrl(token)
      
      expect(url).toBe(`https://maix.io/accept-invitation?token=${token}`)
    })

    it('should generate correct URL with custom base URL', () => {
      const token = 'b'.repeat(64)
      const baseUrl = 'https://custom.example.com'
      
      const url = generateInvitationUrl(token, baseUrl)
      
      expect(url).toBe(`${baseUrl}/accept-invitation?token=${token}`)
    })

    it('should handle missing environment variable', () => {
      delete process.env.NEXT_PUBLIC_APP_URL
      const token = 'c'.repeat(64)
      
      const url = generateInvitationUrl(token)
      
      expect(url).toBe(`http://localhost:3000/accept-invitation?token=${token}`)
    })
  })

  describe('isEmailAlreadyInvited', () => {
    it('should return true if email has pending invitation for organization', async () => {
      // Create an invitation
      await prismaTest.invitation.create({
        data: {
          email: 'test@example.com',
          hashedToken: hashInvitationToken(generateInvitationToken()),
          status: 'PENDING',
          role: 'MEMBER',
          inviterId: testUser.id,
          organizationId: testOrg.id,
          expiresAt: new Date(Date.now() + 86400000)
        }
      })

      const result = await isEmailAlreadyInvited('test@example.com', testOrg.id)

      expect(result).toBe(true)
    })

    it('should return true if email has pending invitation for project', async () => {
      // Create an invitation
      await prismaTest.invitation.create({
        data: {
          email: 'test@example.com',
          hashedToken: hashInvitationToken(generateInvitationToken()),
          status: 'PENDING',
          role: 'MEMBER',
          inviterId: testUser.id,
          projectId: testProject.id,
          expiresAt: new Date(Date.now() + 86400000)
        }
      })

      const result = await isEmailAlreadyInvited('test@example.com', testProject.id)

      expect(result).toBe(true)
    })

    it('should return false if no pending invitation exists', async () => {
      const result = await isEmailAlreadyInvited('test@example.com', testOrg.id)

      expect(result).toBe(false)
    })

    it('should return false if invitation is not pending', async () => {
      // Create an accepted invitation
      await prismaTest.invitation.create({
        data: {
          email: 'test@example.com',
          hashedToken: hashInvitationToken(generateInvitationToken()),
          status: 'ACCEPTED',
          role: 'MEMBER',
          inviterId: testUser.id,
          organizationId: testOrg.id,
          expiresAt: new Date(Date.now() + 86400000),
          acceptedAt: new Date()
        }
      })

      const result = await isEmailAlreadyInvited('test@example.com', testOrg.id)

      expect(result).toBe(false)
    })
  })

  describe('validateInvitationToken', () => {
    it('should return INVALID_FORMAT for malformed tokens', async () => {
      const testCases = [
        '', // empty
        'short', // too short
        'a'.repeat(65), // too long
        'g'.repeat(64), // invalid hex character
      ]

      for (const token of testCases) {
        const result = await validateInvitationToken(token)
        expect(result).toEqual({
          valid: false,
          error: 'INVALID_FORMAT'
        })
      }
    })

    it('should return NOT_FOUND for non-existent token', async () => {
      const token = 'a'.repeat(64)
      const result = await validateInvitationToken(token)

      expect(result).toEqual({
        valid: false,
        error: 'NOT_FOUND'
      })
    })

    it('should return EXPIRED for expired invitation', async () => {
      const token = generateInvitationToken()
      
      // Create expired invitation
      const invitation = await prismaTest.invitation.create({
        data: {
          email: 'test@example.com',
          hashedToken: hashInvitationToken(token),
          status: 'PENDING',
          role: 'MEMBER',
          inviterId: testUser.id,
          organizationId: testOrg.id,
          expiresAt: new Date(Date.now() - 1000) // 1 second ago
        },
        include: {
          inviter: true,
          organization: true,
          product: true,
          project: true
        }
      })

      const result = await validateInvitationToken(token)

      expect(result.valid).toBe(false)
      expect(result.error).toBe('EXPIRED')
      expect(result.invitation?.id).toBe(invitation.id)
    })

    it('should return ALREADY_PROCESSED for accepted invitation', async () => {
      const token = generateInvitationToken()
      
      // Create accepted invitation
      const invitation = await prismaTest.invitation.create({
        data: {
          email: 'test@example.com',
          hashedToken: hashInvitationToken(token),
          status: 'ACCEPTED',
          role: 'MEMBER',
          inviterId: testUser.id,
          organizationId: testOrg.id,
          expiresAt: new Date(Date.now() + 86400000),
          acceptedAt: new Date()
        },
        include: {
          inviter: true,
          organization: true,
          product: true,
          project: true
        }
      })

      const result = await validateInvitationToken(token)

      expect(result.valid).toBe(false)
      expect(result.error).toBe('ALREADY_PROCESSED')
      expect(result.invitation?.id).toBe(invitation.id)
    })

    it('should return valid result for valid pending invitation', async () => {
      const token = generateInvitationToken()
      
      // Create valid invitation
      const invitation = await prismaTest.invitation.create({
        data: {
          email: 'test@example.com',
          hashedToken: hashInvitationToken(token),
          status: 'PENDING',
          role: 'MEMBER',
          inviterId: testUser.id,
          organizationId: testOrg.id,
          expiresAt: new Date(Date.now() + 86400000)
        },
        include: {
          inviter: true,
          organization: true,
          product: true,
          project: true
        }
      })

      const result = await validateInvitationToken(token)

      expect(result.valid).toBe(true)
      expect(result.invitation?.id).toBe(invitation.id)
      expect(result.invitation?.email).toBe('test@example.com')
    })
  })

  describe('cleanupExpiredInvitations', () => {
    it('should delete expired pending invitations', async () => {
      // Create expired invitations
      await prismaTest.invitation.create({
        data: {
          email: 'expired1@example.com',
          hashedToken: hashInvitationToken(generateInvitationToken()),
          status: 'PENDING',
          role: 'MEMBER',
          inviterId: testUser.id,
          organizationId: testOrg.id,
          expiresAt: new Date(Date.now() - 1000)
        }
      })
      
      await prismaTest.invitation.create({
        data: {
          email: 'expired2@example.com',
          hashedToken: hashInvitationToken(generateInvitationToken()),
          status: 'PENDING',
          role: 'MEMBER',
          inviterId: testUser.id,
          projectId: testProject.id,
          expiresAt: new Date(Date.now() - 2000)
        }
      })
      
      // Create valid invitation (should not be deleted)
      await prismaTest.invitation.create({
        data: {
          email: 'valid@example.com',
          hashedToken: hashInvitationToken(generateInvitationToken()),
          status: 'PENDING',
          role: 'MEMBER',
          inviterId: testUser.id,
          organizationId: testOrg.id,
          expiresAt: new Date(Date.now() + 86400000)
        }
      })

      const result = await cleanupExpiredInvitations()

      expect(result).toBe(2)
      
      // Verify only expired invitations were deleted
      const remaining = await prismaTest.invitation.findMany()
      expect(remaining).toHaveLength(1)
      expect(remaining[0].email).toBe('valid@example.com')
    })

    it('should not delete accepted expired invitations', async () => {
      // Create accepted expired invitation
      await prismaTest.invitation.create({
        data: {
          email: 'accepted@example.com',
          hashedToken: hashInvitationToken(generateInvitationToken()),
          status: 'ACCEPTED',
          role: 'MEMBER',
          inviterId: testUser.id,
          organizationId: testOrg.id,
          expiresAt: new Date(Date.now() - 1000),
          acceptedAt: new Date(Date.now() - 2000)
        }
      })

      const result = await cleanupExpiredInvitations()

      expect(result).toBe(0)
      
      // Verify accepted invitation was not deleted
      const remaining = await prismaTest.invitation.findMany()
      expect(remaining).toHaveLength(1)
    })

    it('should return 0 when no expired invitations exist', async () => {
      const result = await cleanupExpiredInvitations()

      expect(result).toBe(0)
    })
  })
})