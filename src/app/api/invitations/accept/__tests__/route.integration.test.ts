/**
 * @jest-environment node
import { describe, it, expect, beforeEach, beforeAll, afterAll } from '@jest/globals'
 */

/**
 * Invitations Accept Route Integration Tests
 * 
 * 🗄️ INTEGRATION TEST - Uses REAL TEST DATABASE on port 5433
 * 
 * Prerequisites:
 *   ✅ Docker test database running (npm run test:db:start)
 *   ✅ .env.test configured with test database URL
 * 
 * This test:
 *   - Creates real invitations, organizations, products, and projects in test database
 *   - Tests actual database constraints and relationships
 *   - Validates hierarchical membership creation with real data
 *   - Verifies invitation acceptance flow with real transactions
 * 
 * Run with: npm run test:integration
 * Run safely with: npm run test:integration:safe (auto-starts DB)
 */

// Mock the prisma module to use test database
jest.mock('@/lib/prisma', () => ({
  prisma: require('@/lib/test/db-test-utils').prismaTest
}))

// Mock only external dependencies
jest.mock('next-auth/next')
jest.mock('@/lib/invitation-utils')

import { NextRequest } from 'next/server'
import { POST } from '../route'
import { getServerSession } from 'next-auth/next'
import { validateInvitationToken } from '@/lib/invitation-utils'
import {
  setupTestDatabase,
  cleanupTestDatabase,
  createTestUser,
  createTestOrganization,
  prismaTest,
  disconnectDatabase
} from '@/lib/test/db-test-utils'

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>
const mockValidateInvitationToken = validateInvitationToken as jest.MockedFunction<typeof validateInvitationToken>

describe('/api/invitations/accept Integration Tests', () => {
  let testUser: any
  let testOrg: any
  let testProduct: any
  let testProject: any
  let testInvitation: any

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
      name: 'Test User',
      email: 'user@example.com'
    })
    
    const orgOwner = await createTestUser({
      name: 'Org Owner',
      email: 'owner@example.com'
    })
    
    testOrg = await createTestOrganization(orgOwner.id, {
      name: 'Test Organization',
      slug: 'test-org'
    })
    
    // Create product under the organization
    testProduct = await prismaTest.product.create({
      data: {
        name: 'Test Product',
        description: 'Test product description',
        organizationId: testOrg.id,
        ownerId: orgOwner.id
      }
    })
    
    // Create project under the product
    testProject = await prismaTest.project.create({
      data: {
        name: 'Test Project',
        goal: 'Test project goal',
        description: 'Test project description',
        contactEmail: 'project@test.com',
        helpType: 'MVP',
        status: 'AWAITING_VOLUNTEERS',
        visibility: 'PUBLIC',
        productId: testProduct.id,
        organizationId: testOrg.id,
        isActive: true,
        isPersonal: false
      }
    })
  })

  const createMockRequest = (body: any) => {
    return new NextRequest('http://localhost/api/invitations/accept', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
  }

  describe('Hierarchical invitation acceptance', () => {
    it('should create parent memberships when accepting a project invitation', async () => {
      // Create project invitation
      testInvitation = await prismaTest.invitation.create({
        data: {
          email: 'user@example.com',
          role: 'MEMBER',
          projectId: testProject.id,
          inviterId: testOrg.members[0].userId,
          hashedToken: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
          status: 'PENDING'
        },
        include: {
          project: true
        }
      })

      // Mock session
      mockGetServerSession.mockResolvedValue({
        user: { id: testUser.id, email: testUser.email }
      } as any)

      // Mock invitation validation
      mockValidateInvitationToken.mockResolvedValue({
        valid: true,
        invitation: {
          ...testInvitation,
          token: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
        }
      })

      const request = createMockRequest({ 
        token: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef' 
      })
      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      expect(responseData.message).toContain('You have successfully joined Test Project')
      expect(responseData.message).toContain('You have also been granted access to the parent product and organization')

      // Verify all memberships were created in database
      const projectMember = await prismaTest.projectMember.findUnique({
        where: { 
          projectId_userId: { 
            projectId: testProject.id, 
            userId: testUser.id 
          } 
        }
      })
      expect(projectMember).toBeTruthy()
      expect(projectMember?.role).toBe('MEMBER')

      const productMember = await prismaTest.productMember.findUnique({
        where: { 
          productId_userId: { 
            productId: testProduct.id, 
            userId: testUser.id 
          } 
        }
      })
      expect(productMember).toBeTruthy()
      expect(productMember?.role).toBe('VIEWER')

      const orgMember = await prismaTest.organizationMember.findUnique({
        where: { 
          organizationId_userId: { 
            organizationId: testOrg.id, 
            userId: testUser.id 
          } 
        }
      })
      expect(orgMember).toBeTruthy()
      expect(orgMember?.role).toBe('MEMBER')

      // Verify invitation was marked as accepted
      const updatedInvitation = await prismaTest.invitation.findUnique({
        where: { id: testInvitation.id }
      })
      expect(updatedInvitation?.status).toBe('ACCEPTED')
      expect(updatedInvitation?.acceptedAt).toBeTruthy()
    })

    it('should create only organization membership when accepting a product invitation', async () => {
      // Create product invitation
      testInvitation = await prismaTest.invitation.create({
        data: {
          email: 'user@example.com',
          role: 'ADMIN',
          productId: testProduct.id,
          inviterId: testOrg.members[0].userId,
          hashedToken: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          status: 'PENDING'
        },
        include: {
          product: true
        }
      })

      // Mock session
      mockGetServerSession.mockResolvedValue({
        user: { id: testUser.id, email: testUser.email }
      } as any)

      // Mock invitation validation
      mockValidateInvitationToken.mockResolvedValue({
        valid: true,
        invitation: {
          ...testInvitation,
          token: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
        }
      })

      const request = createMockRequest({ 
        token: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef' 
      })
      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      expect(responseData.message).toContain('You have successfully joined Test Product')
      expect(responseData.message).toContain('You have also been granted access to the parent organization')

      // Verify memberships in database
      const productMember = await prismaTest.productMember.findUnique({
        where: { 
          productId_userId: { 
            productId: testProduct.id, 
            userId: testUser.id 
          } 
        }
      })
      expect(productMember).toBeTruthy()
      expect(productMember?.role).toBe('ADMIN')

      const orgMember = await prismaTest.organizationMember.findUnique({
        where: { 
          organizationId_userId: { 
            organizationId: testOrg.id, 
            userId: testUser.id 
          } 
        }
      })
      expect(orgMember).toBeTruthy()
      expect(orgMember?.role).toBe('MEMBER')

      // Should NOT have project membership
      const projectMembers = await prismaTest.projectMember.findMany({
        where: { userId: testUser.id }
      })
      expect(projectMembers).toHaveLength(0)
    })

    it('should not create duplicate parent memberships', async () => {
      // First, make user a member of the organization
      await prismaTest.organizationMember.create({
        data: {
          organizationId: testOrg.id,
          userId: testUser.id,
          role: 'OWNER' // Higher role than what would be auto-created
        }
      })

      // Create project invitation
      testInvitation = await prismaTest.invitation.create({
        data: {
          email: 'user@example.com',
          role: 'MEMBER',
          projectId: testProject.id,
          inviterId: testOrg.members[0].userId,
          hashedToken: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          status: 'PENDING'
        },
        include: {
          project: true
        }
      })

      // Mock session
      mockGetServerSession.mockResolvedValue({
        user: { id: testUser.id, email: testUser.email }
      } as any)

      // Mock invitation validation
      mockValidateInvitationToken.mockResolvedValue({
        valid: true,
        invitation: {
          ...testInvitation,
          token: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
        }
      })

      const request = createMockRequest({ 
        token: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef' 
      })
      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)

      // Verify organization membership was NOT duplicated and role NOT downgraded
      const orgMembers = await prismaTest.organizationMember.findMany({
        where: { userId: testUser.id }
      })
      expect(orgMembers).toHaveLength(1)
      expect(orgMembers[0].role).toBe('OWNER') // Original role preserved

      // But product and project memberships were created
      const projectMember = await prismaTest.projectMember.findUnique({
        where: { 
          projectId_userId: { 
            projectId: testProject.id, 
            userId: testUser.id 
          } 
        }
      })
      expect(projectMember).toBeTruthy()

      const productMember = await prismaTest.productMember.findUnique({
        where: { 
          productId_userId: { 
            productId: testProduct.id, 
            userId: testUser.id 
          } 
        }
      })
      expect(productMember).toBeTruthy()
    })

    it('should create no parent memberships for organization invitations', async () => {
      // Create organization invitation
      testInvitation = await prismaTest.invitation.create({
        data: {
          email: 'user@example.com',
          role: 'OWNER',
          organizationId: testOrg.id,
          inviterId: testOrg.members[0].userId,
          hashedToken: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          status: 'PENDING'
        },
        include: {
          organization: true
        }
      })

      // Mock session
      mockGetServerSession.mockResolvedValue({
        user: { id: testUser.id, email: testUser.email }
      } as any)

      // Mock invitation validation
      mockValidateInvitationToken.mockResolvedValue({
        valid: true,
        invitation: {
          ...testInvitation,
          token: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
        }
      })

      const request = createMockRequest({ 
        token: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef' 
      })
      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      expect(responseData.message).toBe('You have successfully joined Test Organization as a owner.')
      expect(responseData.message).not.toContain('parent')

      // Verify only organization membership was created
      const orgMember = await prismaTest.organizationMember.findUnique({
        where: { 
          organizationId_userId: { 
            organizationId: testOrg.id, 
            userId: testUser.id 
          } 
        }
      })
      expect(orgMember).toBeTruthy()
      expect(orgMember?.role).toBe('OWNER')

      // Should NOT have product or project memberships
      const productMembers = await prismaTest.productMember.findMany({
        where: { userId: testUser.id }
      })
      expect(productMembers).toHaveLength(0)

      const projectMembers = await prismaTest.projectMember.findMany({
        where: { userId: testUser.id }
      })
      expect(projectMembers).toHaveLength(0)
    })

    it('should reject invitation with email mismatch', async () => {
      // Create invitation for different email
      testInvitation = await prismaTest.invitation.create({
        data: {
          email: 'different@example.com',
          role: 'MEMBER',
          organizationId: testOrg.id,
          inviterId: testOrg.members[0].userId,
          hashedToken: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          status: 'PENDING'
        },
        include: {
          organization: true
        }
      })

      // Mock session with different email
      mockGetServerSession.mockResolvedValue({
        user: { id: testUser.id, email: 'user@example.com' }
      } as any)

      // Mock invitation validation
      mockValidateInvitationToken.mockResolvedValue({
        valid: true,
        invitation: {
          ...testInvitation,
          token: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
        }
      })

      const request = createMockRequest({ 
        token: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef' 
      })
      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(403)
      expect(responseData.success).toBe(false)
      expect(responseData.error).toBe('EMAIL_MISMATCH')
      expect(responseData.message).toBe('This invitation was sent to a different email address')

      // Verify no memberships were created
      const orgMember = await prismaTest.organizationMember.findUnique({
        where: { 
          organizationId_userId: { 
            organizationId: testOrg.id, 
            userId: testUser.id 
          } 
        }
      })
      expect(orgMember).toBeNull()

      // Verify invitation was NOT accepted
      const invitation = await prismaTest.invitation.findUnique({
        where: { id: testInvitation.id }
      })
      expect(invitation?.status).toBe('PENDING')
    })

    it('should reject if user is already a member', async () => {
      // Make user already a member
      await prismaTest.organizationMember.create({
        data: {
          organizationId: testOrg.id,
          userId: testUser.id,
          role: 'MEMBER'
        }
      })

      // Create another invitation
      testInvitation = await prismaTest.invitation.create({
        data: {
          email: 'user@example.com',
          role: 'ADMIN',
          organizationId: testOrg.id,
          inviterId: testOrg.members[0].userId,
          hashedToken: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          status: 'PENDING'
        },
        include: {
          organization: true
        }
      })

      // Mock session
      mockGetServerSession.mockResolvedValue({
        user: { id: testUser.id, email: 'user@example.com' }
      } as any)

      // Mock invitation validation
      mockValidateInvitationToken.mockResolvedValue({
        valid: true,
        invitation: {
          ...testInvitation,
          token: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
        }
      })

      const request = createMockRequest({ 
        token: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef' 
      })
      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.success).toBe(false)
      expect(responseData.error).toBe('ALREADY_MEMBER')
      expect(responseData.message).toBe('You are already a member of this organization, product, or project')

      // Verify role was NOT upgraded
      const orgMember = await prismaTest.organizationMember.findUnique({
        where: { 
          organizationId_userId: { 
            organizationId: testOrg.id, 
            userId: testUser.id 
          } 
        }
      })
      expect(orgMember?.role).toBe('MEMBER') // Original role preserved
    })

    it('should handle expired invitations', async () => {
      // Create expired invitation
      testInvitation = await prismaTest.invitation.create({
        data: {
          email: 'user@example.com',
          role: 'MEMBER',
          organizationId: testOrg.id,
          inviterId: testOrg.members[0].userId,
          hashedToken: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
          expiresAt: new Date(Date.now() - 1000), // Already expired
          status: 'PENDING'
        },
        include: {
          organization: true
        }
      })

      // Mock session
      mockGetServerSession.mockResolvedValue({
        user: { id: testUser.id, email: 'user@example.com' }
      } as any)

      // Mock invitation validation returning expired error
      mockValidateInvitationToken.mockResolvedValue({
        valid: false,
        error: 'EXPIRED',
        invitation: null
      })

      const request = createMockRequest({ 
        token: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef' 
      })
      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.success).toBe(false)
      expect(responseData.error).toBe('EXPIRED')
      expect(responseData.message).toBe('This invitation has expired')
    })

    it('should handle already accepted invitations', async () => {
      // Create already accepted invitation
      testInvitation = await prismaTest.invitation.create({
        data: {
          email: 'user@example.com',
          role: 'MEMBER',
          organizationId: testOrg.id,
          inviterId: testOrg.members[0].userId,
          hashedToken: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          status: 'ACCEPTED',
          acceptedAt: new Date()
        },
        include: {
          organization: true
        }
      })

      // Mock session
      mockGetServerSession.mockResolvedValue({
        user: { id: testUser.id, email: 'user@example.com' }
      } as any)

      // Mock invitation validation returning already processed error
      mockValidateInvitationToken.mockResolvedValue({
        valid: false,
        error: 'ALREADY_PROCESSED',
        invitation: null
      })

      const request = createMockRequest({ 
        token: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef' 
      })
      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.success).toBe(false)
      expect(responseData.error).toBe('ALREADY_PROCESSED')
      expect(responseData.message).toBe('This invitation has already been accepted or declined')
    })

    it('should return 401 for unauthenticated user', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const request = createMockRequest({ 
        token: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef' 
      })
      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(401)
      expect(responseData.error).toBe('Unauthorized')
    })

    it('should validate input format', async () => {
      // Mock session
      mockGetServerSession.mockResolvedValue({
        user: { id: testUser.id, email: 'user@example.com' }
      } as any)

      const request = createMockRequest({ 
        token: 'invalid-token-format' // Too short
      })
      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error).toBe('Invalid input')
      expect(responseData.details).toBeDefined()
    })

    // Note: Transaction rollback testing is not included here because:
    // 1. With real database constraints, we can't create invalid references
    // 2. Cascade deletes remove the invitation when related entities are deleted
    // 3. Transaction behavior is better tested at the database/Prisma level
    // The integration test focuses on real-world scenarios with valid data
  })
})