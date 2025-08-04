/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { prisma } from '@/lib/prisma'
import { POST as createProject } from '@/app/api/projects/route'
import { POST as createProduct } from '@/app/api/products/route'
import { POST as createOrg } from '@/app/api/organizations/route'
import { createMockRequest, mockSession, createTestUser } from '@/__tests__/helpers/api-test-utils.helper'

// Mock next-auth
jest.mock('next-auth/next')
const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: jest.fn(),
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    project: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    product: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    organization: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    organizationMember: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    projectMember: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    productMember: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    post: {
      create: jest.fn(),
    },
  }
}))

describe('Dual Ownership Tests', () => {
  const mockUser = createTestUser({
    id: 'cjld2cjxh0000qzrmn831i7rn',
    email: 'test@example.com',
    name: 'Test User'
  })

  const mockOrg = {
    id: 'cjld2cyuq0000t3rmniod1foy',
    name: 'Test Org',
    slug: 'test-org'
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockSession(mockUser)
    
    // Mock the user lookup in withAuth
    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)
  })

  describe('Project Creation with Dual Ownership', () => {
    it('should create user-owned project by default', async () => {
      const mockProject = {
        id: 'proj123',
        name: 'Test Project',
        ownerId: mockUser.id,
        organizationId: null
      }

      ;(prisma.$transaction as jest.Mock).mockImplementation((fn) => 
        fn({
          project: {
            create: jest.fn().mockResolvedValue(mockProject),
            findUnique: jest.fn().mockResolvedValue(mockProject)
          },
          projectMember: {
            create: jest.fn()
          },
          post: {
            create: jest.fn()
          },
          organizationMember: {
            findUnique: jest.fn()
          }
        })
      )
      ;(prisma.user.findMany as jest.Mock).mockResolvedValue([])
      ;(prisma.user.findMany as jest.Mock).mockResolvedValue([])

      const requestBody = {
        name: 'Test Project',
        goal: 'Test project goal description',
        description: 'This is a test project with a detailed description of at least 50 characters',
        contactEmail: 'contact@example.com',
        helpType: 'MVP'
      }
      
      const req = createMockRequest(
        'POST',
        'http://localhost:3000/api/projects',
        requestBody
      )

      const response = await createProject(req)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.ownerId).toBe(mockUser.id)
      expect(data.organizationId).toBeNull()
    })

    it('should create organization-owned project when organizationId provided', async () => {
      const mockProject = {
        id: 'proj123',
        name: 'Test Project',
        ownerId: null,
        organizationId: mockOrg.id,
        organization: mockOrg
      }

      ;(prisma.$transaction as jest.Mock).mockImplementation((fn) => 
        fn({
          project: {
            create: jest.fn().mockResolvedValue(mockProject),
            findUnique: jest.fn().mockResolvedValue(mockProject)
          },
          projectMember: {
            create: jest.fn()
          },
          post: {
            create: jest.fn()
          },
          organizationMember: {
            findUnique: jest.fn().mockResolvedValue({
              userId: mockUser.id,
              organizationId: mockOrg.id,
              role: 'MEMBER'
            })
          }
        })
      )
      ;(prisma.user.findMany as jest.Mock).mockResolvedValue([])

      const requestBody = {
        name: 'Test Project',
        goal: 'Test project goal description',
        description: 'This is a test project with a detailed description of at least 50 characters',
        contactEmail: 'contact@example.com',
        helpType: 'MVP',
        organizationId: mockOrg.id
      }
      
      const req = createMockRequest(
        'POST',
        'http://localhost:3000/api/projects',
        requestBody
      )

      const response = await createProject(req)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.ownerId).toBeNull()
      expect(data.organizationId).toBe(mockOrg.id)
    })

    it('should fail if user is not organization member', async () => {
      ;(prisma.$transaction as jest.Mock).mockImplementation((fn) => 
        fn({
          organizationMember: {
            findUnique: jest.fn().mockResolvedValue(null) // Not a member
          }
        })
      )
      ;(prisma.user.findMany as jest.Mock).mockResolvedValue([])

      const requestBody = {
        name: 'Test Project',
        goal: 'Test project goal description',
        description: 'This is a test project with a detailed description of at least 50 characters',
        contactEmail: 'contact@example.com',
        helpType: 'MVP',
        organizationId: mockOrg.id
      }
      
      const req = createMockRequest(
        'POST',
        'http://localhost:3000/api/projects',
        requestBody
      )

      const response = await createProject(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('must be a member of the organization')
    })
  })

  describe('Product Creation with Dual Ownership', () => {
    it('should create organization-owned product when organizationId provided', async () => {
      const mockProduct = {
        id: 'prod123',
        name: 'Test Product',
        ownerId: null,
        organizationId: mockOrg.id,
        organization: mockOrg
      }

      ;(prisma.$transaction as jest.Mock).mockImplementation((fn) => 
        fn({
          product: {
            create: jest.fn().mockResolvedValue(mockProduct),
            findUnique: jest.fn().mockResolvedValue(mockProduct)
          },
          productMember: {
            create: jest.fn()
          },
          post: {
            create: jest.fn()
          },
          organizationMember: {
            findUnique: jest.fn().mockResolvedValue({
              userId: mockUser.id,
              organizationId: mockOrg.id,
              role: 'MEMBER'
            })
          }
        })
      )
      ;(prisma.user.findMany as jest.Mock).mockResolvedValue([])

      const requestBody = {
        name: 'Test Product',
        description: 'Test product description',
        organizationId: mockOrg.id
      }
      
      const req = createMockRequest(
        'POST',
        'http://localhost:3000/api/products',
        requestBody
      )

      const response = await createProduct(req)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.ownerId).toBeNull()
      expect(data.organizationId).toBe(mockOrg.id)
    })
  })

  describe('Ownership Validation', () => {
    it('should validate exactly one owner constraint', async () => {
      // Test is handled by validateOwnership function
      // This test verifies the validation logic is called during creation
      const { validateOwnership } = require('@/lib/ownership-utils')
      
      // Valid: user ownership
      expect(() => validateOwnership({ ownerId: mockUser.id, organizationId: null })).not.toThrow()
      
      // Valid: org ownership
      expect(() => validateOwnership({ ownerId: null, organizationId: mockOrg.id })).not.toThrow()
      
      // Invalid: both owners
      expect(() => validateOwnership({ ownerId: mockUser.id, organizationId: mockOrg.id }))
        .toThrow('exactly one user OR one organization')
      
      // Invalid: no owner
      expect(() => validateOwnership({ ownerId: null, organizationId: null }))
        .toThrow('must have an owner')
    })
  })

  describe('Resource Access Control', () => {
    it('should allow organization members to access private org resources', async () => {
      const { hasResourceAccess } = require('@/lib/ownership-utils')
      
      // Mock organization member check
      ;(prisma.organizationMember.findUnique as jest.Mock).mockResolvedValue({
        userId: mockUser.id,
        organizationId: mockOrg.id,
        role: 'MEMBER'
      })

      const resource = {
        ownerId: null,
        organizationId: mockOrg.id,
        visibility: 'PRIVATE'
      }

      const hasAccess = await hasResourceAccess(mockUser.id, resource, 'read')
      expect(hasAccess).toBe(true)
    })

    it('should require OWNER role for delete operations on org resources', async () => {
      const { hasResourceAccess } = require('@/lib/ownership-utils')
      
      // Mock organization member check
      ;(prisma.organizationMember.findUnique as jest.Mock).mockResolvedValue({
        userId: mockUser.id,
        organizationId: mockOrg.id,
        role: 'MEMBER' // Not OWNER
      })

      const resource = {
        ownerId: null,
        organizationId: mockOrg.id,
        visibility: 'PRIVATE'
      }

      const canDelete = await hasResourceAccess(mockUser.id, resource, 'delete')
      expect(canDelete).toBe(false)
    })
  })
})