/**
 * @jest-environment node
import { describe, it, expect, beforeEach, beforeAll, afterAll } from '@jest/globals'
 */

/**
 * Applications Route Integration Tests
 * 
 * 🗄️ INTEGRATION TEST - Uses REAL TEST DATABASE on port 5433
 * 
 * Prerequisites:
 *   ✅ Docker test database running (npm run test:db:start)
 *   ✅ .env.test configured with test database URL
 * 
 * This test:
 *   - Creates real projects, users, and applications in test database
 *   - Tests actual database constraints and relationships
 *   - Validates authorization with real ownership checks
 *   - Verifies application status updates with real data
 * 
 * Run with: npm run test:integration
 * Run safely with: npm run test:integration:safe (auto-starts DB)
 */

// Mock the prisma module to use test database
jest.mock('@/lib/prisma', () => ({
  prisma: require('@/lib/test/db-test-utils').prismaTest
}))

// Mock only external dependencies
jest.mock('@/lib/auth-utils')

import { NextRequest } from 'next/server'
import { PATCH } from '../route'
import { requireAuth } from '@/lib/auth-utils'
import {
  setupTestDatabase,
  cleanupTestDatabase,
  createTestUser,
  prismaTest,
  disconnectDatabase
} from '@/lib/test/db-test-utils'

const mockRequireAuth = requireAuth as jest.MockedFunction<typeof requireAuth>

describe('/api/applications/[id] Integration Tests', () => {
  let testUser: any
  let projectOwner: any
  let testProject: any
  let testApplication: any

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
      name: 'Test Applicant',
      email: 'applicant@example.com'
    })
    
    projectOwner = await createTestUser({
      name: 'Project Owner',
      email: 'owner@example.com'
    })
    
    testProject = await prismaTest.project.create({
      data: {
        name: 'Test Project',
        goal: 'Test project goal',
        description: 'Test project description',
        contactEmail: 'contact@test.com',
        helpType: 'MVP',
        status: 'AWAITING_VOLUNTEERS',
        visibility: 'PUBLIC',
        ownerId: projectOwner.id,
        isActive: true,
        isPersonal: false
      }
    })
    
    testApplication = await prismaTest.application.create({
      data: {
        message: 'I would like to contribute to this project',
        status: 'PENDING',
        userId: testUser.id,
        projectId: testProject.id
      }
    })
  })

  const createMockRequest = (body: any) => {
    return new Request('http://localhost/api/applications/123', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
  }

  describe('PATCH /api/applications/[id]', () => {
    it('should update application status when project owner approves', async () => {
      // Mock auth as project owner
      mockRequireAuth.mockResolvedValue({
        id: projectOwner.id,
        email: projectOwner.email,
        name: projectOwner.name,
      } as any)

      const updateData = {
        status: 'ACCEPTED',
        message: 'Welcome to the team!'
      }

      const request = createMockRequest(updateData)
      const response = await PATCH(request, { 
        params: Promise.resolve({ id: testApplication.id }) 
      })
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.status).toBe('ACCEPTED')
      expect(responseData.message).toBe('Welcome to the team!')
      expect(responseData.respondedAt).toBeDefined()
      expect(responseData.user.name).toBe('Test Applicant')

      // Verify in database
      const updatedApp = await prismaTest.application.findUnique({
        where: { id: testApplication.id }
      })
      expect(updatedApp?.status).toBe('ACCEPTED')
      expect(updatedApp?.message).toBe('Welcome to the team!')
      expect(updatedApp?.respondedAt).toBeTruthy()
    })

    it('should reject application update from non-owner', async () => {
      const otherUser = await createTestUser({
        name: 'Other User',
        email: 'other@example.com'
      })

      // Mock auth as different user
      mockRequireAuth.mockResolvedValue({
        id: otherUser.id,
        email: otherUser.email,
        name: otherUser.name,
      } as any)

      const updateData = {
        status: 'ACCEPTED',
        message: 'Welcome!'
      }

      const request = createMockRequest(updateData)
      const response = await PATCH(request, { 
        params: Promise.resolve({ id: testApplication.id }) 
      })
      const responseData = await response.json()

      expect(response.status).toBe(403)
      expect(responseData.message).toBe('Unauthorized')

      // Verify application unchanged in database
      const unchangedApp = await prismaTest.application.findUnique({
        where: { id: testApplication.id }
      })
      expect(unchangedApp?.status).toBe('PENDING')
      expect(unchangedApp?.message).toBe('I would like to contribute to this project')
      expect(unchangedApp?.respondedAt).toBeNull()
    })

    it('should allow organization owner to update application', async () => {
      // Create organization with owner
      const orgOwner = await createTestUser({
        name: 'Org Owner',
        email: 'orgowner@example.com'
      })

      const org = await prismaTest.organization.create({
        data: {
          name: 'Test Organization',
          slug: 'test-org',
          description: 'Test organization',
          members: {
            create: {
              userId: orgOwner.id,
              role: 'OWNER'
            }
          }
        }
      })

      // Create project owned by organization
      const orgProject = await prismaTest.project.create({
        data: {
          name: 'Org Project',
          goal: 'Organization project goal',
          description: 'Organization project description',
          contactEmail: 'org@test.com',
          helpType: 'FEATURE',
          status: 'AWAITING_VOLUNTEERS',
          visibility: 'PUBLIC',
          organizationId: org.id,
          isActive: true,
          isPersonal: false
        }
      })

      const orgApplication = await prismaTest.application.create({
        data: {
          message: 'Applying to org project',
          status: 'PENDING',
          userId: testUser.id,
          projectId: orgProject.id
        }
      })

      // Mock auth as org owner
      mockRequireAuth.mockResolvedValue({
        id: orgOwner.id,
        email: orgOwner.email,
        name: orgOwner.name,
      } as any)

      const updateData = {
        status: 'REJECTED',
        message: 'Not a good fit at this time'
      }

      const request = createMockRequest(updateData)
      const response = await PATCH(request, { 
        params: Promise.resolve({ id: orgApplication.id }) 
      })
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.status).toBe('REJECTED')
      expect(responseData.message).toBe('Not a good fit at this time')
    })

    it('should return 404 for non-existent application', async () => {
      mockRequireAuth.mockResolvedValue({
        id: projectOwner.id,
        email: projectOwner.email,
        name: projectOwner.name,
      } as any)

      const request = createMockRequest({ status: 'ACCEPTED' })
      const response = await PATCH(request, { 
        params: Promise.resolve({ id: 'non-existent-id' }) 
      })
      const responseData = await response.json()

      expect(response.status).toBe(404)
      expect(responseData.message).toBe('Application not found')
    })

    it('should validate status enum values', async () => {
      mockRequireAuth.mockResolvedValue({
        id: projectOwner.id,
        email: projectOwner.email,
        name: projectOwner.name,
      } as any)

      const request = createMockRequest({ 
        status: 'INVALID_STATUS' 
      })
      const response = await PATCH(request, { 
        params: Promise.resolve({ id: testApplication.id }) 
      })
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.message).toBe('Invalid input')
    })

    it('should validate message length', async () => {
      mockRequireAuth.mockResolvedValue({
        id: projectOwner.id,
        email: projectOwner.email,
        name: projectOwner.name,
      } as any)

      const request = createMockRequest({ 
        status: 'ACCEPTED',
        message: 'A'.repeat(1001) // Too long
      })
      const response = await PATCH(request, { 
        params: Promise.resolve({ id: testApplication.id }) 
      })
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.message).toBe('Response message must be less than 1000 characters long')
    })

    it('should accept all valid status values', async () => {
      mockRequireAuth.mockResolvedValue({
        id: projectOwner.id,
        email: projectOwner.email,
        name: projectOwner.name,
      } as any)

      const validStatuses = ['PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN']
      
      for (const status of validStatuses) {
        // Create fresh application for each test
        const app = await prismaTest.application.create({
          data: {
            message: 'Test application',
            status: 'PENDING',
            userId: testUser.id,
            projectId: testProject.id
          }
        })

        const request = createMockRequest({ status })
        const response = await PATCH(request, { 
          params: Promise.resolve({ id: app.id }) 
        })
        const responseData = await response.json()

        expect(response.status).toBe(200)
        expect(responseData.status).toBe(status)
      }
    })

    it('should update only status without message', async () => {
      mockRequireAuth.mockResolvedValue({
        id: projectOwner.id,
        email: projectOwner.email,
        name: projectOwner.name,
      } as any)

      const request = createMockRequest({ 
        status: 'REJECTED' 
      })
      const response = await PATCH(request, { 
        params: Promise.resolve({ id: testApplication.id }) 
      })
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.status).toBe('REJECTED')
      
      // Original message should be preserved
      const updated = await prismaTest.application.findUnique({
        where: { id: testApplication.id }
      })
      expect(updated?.message).toBe('I would like to contribute to this project')
    })

    it('should update only message without status', async () => {
      mockRequireAuth.mockResolvedValue({
        id: projectOwner.id,
        email: projectOwner.email,
        name: projectOwner.name,
      } as any)

      const request = createMockRequest({ 
        message: 'Thank you for your interest' 
      })
      const response = await PATCH(request, { 
        params: Promise.resolve({ id: testApplication.id }) 
      })
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.message).toBe('Thank you for your interest')
      
      // Original status should be preserved
      const updated = await prismaTest.application.findUnique({
        where: { id: testApplication.id }
      })
      expect(updated?.status).toBe('PENDING')
    })

    it('should return 401 for unauthenticated user', async () => {
      mockRequireAuth.mockRejectedValue(new Error('Not authenticated'))

      const request = createMockRequest({ status: 'ACCEPTED' })
      const response = await PATCH(request, { 
        params: Promise.resolve({ id: testApplication.id }) 
      })
      const responseData = await response.json()

      expect(response.status).toBe(401)
      expect(responseData.message).toBe('Authentication required')
    })

    it('should handle concurrent updates correctly', async () => {
      mockRequireAuth.mockResolvedValue({
        id: projectOwner.id,
        email: projectOwner.email,
        name: projectOwner.name,
      } as any)

      // Create multiple requests for the same application
      const requests = [
        createMockRequest({ status: 'ACCEPTED', message: 'Update 1' }),
        createMockRequest({ status: 'REJECTED', message: 'Update 2' }),
        createMockRequest({ status: 'PENDING', message: 'Update 3' })
      ]

      const responses = await Promise.all(
        requests.map(req => 
          PATCH(req, { params: Promise.resolve({ id: testApplication.id }) })
        )
      )

      // All should succeed (last write wins in database)
      responses.forEach(response => {
        expect(response.status).toBe(200)
      })

      // Check final state in database
      const finalApp = await prismaTest.application.findUnique({
        where: { id: testApplication.id }
      })
      
      // One of the updates should have won
      expect(['ACCEPTED', 'REJECTED', 'PENDING']).toContain(finalApp?.status)
      expect(['Update 1', 'Update 2', 'Update 3']).toContain(finalApp?.message)
    })
  })
})