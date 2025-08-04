import { NextRequest } from 'next/server'
import { GET, POST } from '../route'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth/next'
import { createMockRequest, mockSession, createTestUser, createTestProject } from '@/__tests__/helpers/api-test-utils.helper'
import { canManageTodos, isValidAssignee } from '@/lib/permissions/todo-permissions'

// Mock dependencies
jest.mock('next-auth/next')
jest.mock('@/lib/prisma', () => ({
  prisma: {
    todo: {
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn()
    },
    project: {
      findUnique: jest.fn()
    },
    application: {
      findUnique: jest.fn()
    }
  }
}))
jest.mock('@/lib/permissions/todo-permissions', () => ({
  canManageTodos: jest.fn(),
  isValidAssignee: jest.fn()
}))

const mockPrisma = prisma as jest.Mocked<typeof prisma>
const mockGetServerSession = getServerSession as jest.Mock
const mockCanManageTodos = canManageTodos as jest.Mock
const mockIsValidAssignee = isValidAssignee as jest.Mock

describe('/api/projects/[id]/todos', () => {
  const mockUser = createTestUser({
    id: 'user-1',
    name: 'Test User'
  })

  const mockProject = {
    id: 'project-1',
    name: 'Test Project',
    ownerId: mockUser.id,
    organizationId: null,
    organization: null,
    applications: []
  }

  const mockTodo = {
    id: 'todo-1',
    title: 'Test Todo',
    description: 'Test description',
    status: 'OPEN',
    dueDate: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    projectId: mockProject.id,
    creatorId: mockUser.id,
    assigneeId: null,
    creator: mockUser,
    assignee: null,
    posts: []
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockGetServerSession.mockResolvedValue(mockSession(mockUser))
    mockCanManageTodos.mockResolvedValue(true)
    mockIsValidAssignee.mockResolvedValue(true)
  })

  describe('GET', () => {
    it('should return todos for a project', async () => {
      mockPrisma.todo.findMany.mockResolvedValue([mockTodo])
      mockPrisma.todo.count.mockResolvedValue(1)

      const req = createMockRequest({
        method: 'GET',
        url: `/api/projects/${mockProject.id}/todos`
      }) as NextRequest

      const response = await GET(req, { params: Promise.resolve({ id: mockProject.id }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.todos).toHaveLength(1)
      expect(data.todos[0].id).toBe('todo-1')
      expect(data.pagination.total).toBe(1)
    })

    it('should filter by status', async () => {
      mockPrisma.todo.findMany.mockResolvedValue([])
      mockPrisma.todo.count.mockResolvedValue(0)

      const req = createMockRequest({
        method: 'GET',
        url: `/api/projects/${mockProject.id}/todos?status=COMPLETED`
      }) as NextRequest

      await GET(req, { params: Promise.resolve({ id: mockProject.id }) })

      expect(mockPrisma.todo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            projectId: mockProject.id,
            status: 'COMPLETED'
          })
        })
      )
    })

    it('should require authentication', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const req = createMockRequest({
        method: 'GET',
        url: `/api/projects/${mockProject.id}/todos`
      }) as NextRequest

      const response = await GET(req, { params: Promise.resolve({ id: mockProject.id }) })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })
  })

  describe('POST', () => {
    const validTodoData = {
      title: 'New Todo',
      description: 'New todo description'
    }

    beforeEach(() => {
      mockPrisma.project.findUnique.mockResolvedValue(mockProject)
    })

    it('should create a todo for project owner', async () => {
      mockPrisma.todo.create.mockResolvedValue({
        ...mockTodo,
        ...validTodoData,
        id: 'new-todo-1'
      })

      const req = createMockRequest({
        method: 'POST',
        url: `/api/projects/${mockProject.id}/todos`,
        body: validTodoData
      }) as NextRequest

      const response = await POST(req, { params: Promise.resolve({ id: mockProject.id }) })
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.todo.title).toBe('New Todo')
      expect(mockPrisma.todo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: 'New Todo',
            description: 'New todo description',
            projectId: mockProject.id,
            creatorId: mockUser.id
          })
        })
      )
    })

    it('should create todo for accepted volunteer', async () => {
      const volunteerUser = createTestUser({ id: 'volunteer-1' })
      mockGetServerSession.mockResolvedValue(mockSession(volunteerUser))
      
      mockPrisma.project.findUnique.mockResolvedValue({
        ...mockProject,
        applications: [{ userId: volunteerUser.id, status: 'ACCEPTED' }]
      })

      mockPrisma.todo.create.mockResolvedValue({
        ...mockTodo,
        creatorId: volunteerUser.id
      })

      const req = createMockRequest({
        method: 'POST',
        url: `/api/projects/${mockProject.id}/todos`,
        body: validTodoData
      }) as NextRequest

      const response = await POST(req, { params: Promise.resolve({ id: mockProject.id }) })

      expect(response.status).toBe(201)
    })

    it('should reject todo creation from non-participant', async () => {
      const otherUser = createTestUser({ id: 'other-user' })
      mockGetServerSession.mockResolvedValue(mockSession(otherUser))
      
      mockPrisma.project.findUnique.mockResolvedValue(mockProject)

      const req = createMockRequest({
        method: 'POST',
        url: `/api/projects/${mockProject.id}/todos`,
        body: validTodoData
      }) as NextRequest

      const response = await POST(req, { params: Promise.resolve({ id: mockProject.id }) })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Forbidden')
    })

    it('should validate assignee is project participant', async () => {
      mockPrisma.project.findUnique.mockResolvedValue(mockProject)
      mockPrisma.application.findUnique.mockResolvedValue(null)

      const req = createMockRequest({
        method: 'POST',
        url: `/api/projects/${mockProject.id}/todos`,
        body: {
          ...validTodoData,
          assigneeId: 'non-participant-id'
        }
      }) as NextRequest

      const response = await POST(req, { params: Promise.resolve({ id: mockProject.id }) })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Assignee must be a project participant')
    })

    it('should require title', async () => {
      const req = createMockRequest({
        method: 'POST',
        url: `/api/projects/${mockProject.id}/todos`,
        body: { description: 'No title' }
      }) as NextRequest

      const response = await POST(req, { params: Promise.resolve({ id: mockProject.id }) })

      expect(response.status).toBe(500) // Zod validation will throw
    })
  })
})