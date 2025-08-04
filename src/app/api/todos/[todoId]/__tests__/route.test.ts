import { NextRequest } from 'next/server'
import { GET, PATCH, DELETE } from '../route'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth/next'
import { createMockRequest, mockSession, createTestUser, createTestProject } from '@/__tests__/helpers/api-test-utils.helper'

// Mock dependencies
jest.mock('next-auth/next')
jest.mock('@/lib/prisma', () => ({
  prisma: {
    todo: {
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    },
    project: {
      findUnique: jest.fn()
    },
    application: {
      findUnique: jest.fn()
    }
  }
}))

const mockPrisma = prisma as jest.Mocked<typeof prisma>
const mockGetServerSession = getServerSession as jest.Mock

describe('/api/todos/[todoId]', () => {
  const mockUser = createTestUser({
    id: 'user-1',
    name: 'Test User'
  })

  const mockCreator = createTestUser({
    id: 'creator-1',
    name: 'Creator User'
  })

  const mockAssignee = createTestUser({
    id: 'assignee-1',
    name: 'Assignee User'
  })

  const mockProject = {
    id: 'project-1',
    name: 'Test Project',
    goal: 'Test project goal',
    ownerId: 'owner-1',
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
    creatorId: mockCreator.id,
    assigneeId: mockAssignee.id,
    creator: mockCreator,
    assignee: mockAssignee,
    project: mockProject,
    posts: []
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockGetServerSession.mockResolvedValue(mockSession(mockUser))
  })

  describe('GET', () => {
    it('should return todo details', async () => {
      mockPrisma.todo.findUnique.mockResolvedValue(mockTodo)

      const req = createMockRequest({
        method: 'GET',
        url: `/api/todos/${mockTodo.id}`
      }) as NextRequest

      const response = await GET(req, { params: Promise.resolve({ todoId: mockTodo.id }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.todo.id).toBe('todo-1')
      expect(data.todo.title).toBe('Test Todo')
    })

    it('should return 404 for non-existent todo', async () => {
      mockPrisma.todo.findUnique.mockResolvedValue(null)

      const req = createMockRequest({
        method: 'GET',
        url: '/api/todos/non-existent'
      }) as NextRequest

      const response = await GET(req, { params: Promise.resolve({ todoId: 'non-existent' }) })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Todo not found')
    })

    it('should require authentication', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const req = createMockRequest({
        method: 'GET',
        url: `/api/todos/${mockTodo.id}`
      }) as NextRequest

      const response = await GET(req, { params: Promise.resolve({ todoId: mockTodo.id }) })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })
  })

  describe('PATCH', () => {
    const updateData = {
      title: 'Updated Todo',
      status: 'IN_PROGRESS'
    }

    beforeEach(() => {
      mockPrisma.todo.findUnique.mockResolvedValue(mockTodo)
    })

    it('should update todo for creator', async () => {
      mockGetServerSession.mockResolvedValue(mockSession(mockCreator))
      
      const todoWithProjectOwner = {
        ...mockTodo,
        project: {
          ...mockProject,
          owner: { id: 'owner-1' },
          organization: null
        }
      }
      
      mockPrisma.todo.findUnique
        .mockResolvedValueOnce(todoWithProjectOwner) // canUpdateTodo check
        .mockResolvedValueOnce({ projectId: mockProject.id }) // existing todo check
      
      mockPrisma.todo.update.mockResolvedValue({
        ...mockTodo,
        ...updateData
      })

      const req = createMockRequest({
        method: 'PATCH',
        url: `/api/todos/${mockTodo.id}`,
        body: updateData
      }) as NextRequest

      const response = await PATCH(req, { params: Promise.resolve({ todoId: mockTodo.id }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.todo.title).toBe('Updated Todo')
      expect(data.todo.status).toBe('IN_PROGRESS')
    })

    it('should update todo for assignee', async () => {
      mockGetServerSession.mockResolvedValue(mockSession(mockAssignee))
      
      const todoWithProjectOwner = {
        ...mockTodo,
        project: {
          ...mockProject,
          owner: { id: 'owner-1' },
          organization: null
        }
      }
      
      mockPrisma.todo.findUnique
        .mockResolvedValueOnce(todoWithProjectOwner) // canUpdateTodo check
        .mockResolvedValueOnce({ projectId: mockProject.id }) // existing todo check
      
      mockPrisma.todo.update.mockResolvedValue({
        ...mockTodo,
        ...updateData
      })

      const req = createMockRequest({
        method: 'PATCH',
        url: `/api/todos/${mockTodo.id}`,
        body: updateData
      }) as NextRequest

      const response = await PATCH(req, { params: Promise.resolve({ todoId: mockTodo.id }) })

      expect(response.status).toBe(200)
    })

    it('should reject update from non-participant', async () => {
      const otherUser = createTestUser({ id: 'other-user' })
      mockGetServerSession.mockResolvedValue(mockSession(otherUser))
      
      const todoWithProjectOwner = {
        ...mockTodo,
        creatorId: 'different-creator',
        assigneeId: 'different-assignee',
        project: {
          ...mockProject,
          ownerId: 'different-owner',
          owner: { id: 'different-owner' },
          organization: null
        }
      }
      
      mockPrisma.todo.findUnique.mockResolvedValue(todoWithProjectOwner)

      const req = createMockRequest({
        method: 'PATCH',
        url: `/api/todos/${mockTodo.id}`,
        body: updateData
      }) as NextRequest

      const response = await PATCH(req, { params: Promise.resolve({ todoId: mockTodo.id }) })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Forbidden')
    })

    it('should validate assignee is project participant', async () => {
      mockGetServerSession.mockResolvedValue(mockSession(mockCreator))
      
      const todoWithProjectOwner = {
        ...mockTodo,
        project: {
          ...mockProject,
          owner: { id: 'owner-1' },
          organization: null
        }
      }
      
      mockPrisma.todo.findUnique
        .mockResolvedValueOnce(todoWithProjectOwner) // canUpdateTodo check
        .mockResolvedValueOnce({ projectId: mockProject.id }) // existing todo check
      
      mockPrisma.project.findUnique.mockResolvedValue(mockProject)
      mockPrisma.application.findUnique.mockResolvedValue(null)

      const req = createMockRequest({
        method: 'PATCH',
        url: `/api/todos/${mockTodo.id}`,
        body: {
          assigneeId: 'non-participant-id'
        }
      }) as NextRequest

      const response = await PATCH(req, { params: Promise.resolve({ todoId: mockTodo.id }) })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Assignee must be a project participant')
    })
  })

  describe('DELETE', () => {
    it('should delete todo for creator', async () => {
      mockGetServerSession.mockResolvedValue(mockSession(mockCreator))
      
      const todoWithProjectOwner = {
        ...mockTodo,
        project: {
          ...mockProject,
          owner: { id: 'owner-1' },
          organization: null
        }
      }
      
      mockPrisma.todo.findUnique.mockResolvedValue(todoWithProjectOwner)

      const req = createMockRequest({
        method: 'DELETE',
        url: `/api/todos/${mockTodo.id}`
      }) as NextRequest

      const response = await DELETE(req, { params: Promise.resolve({ todoId: mockTodo.id }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(mockPrisma.todo.delete).toHaveBeenCalledWith({
        where: { id: mockTodo.id }
      })
    })

    it('should delete todo for project owner', async () => {
      const projectOwner = createTestUser({ id: mockProject.ownerId })
      mockGetServerSession.mockResolvedValue(mockSession(projectOwner))
      
      const todoWithProjectOwner = {
        ...mockTodo,
        creatorId: 'different-creator',
        project: {
          ...mockProject,
          owner: { id: mockProject.ownerId },
          organization: null
        }
      }
      
      mockPrisma.todo.findUnique.mockResolvedValue(todoWithProjectOwner)

      const req = createMockRequest({
        method: 'DELETE',
        url: `/api/todos/${mockTodo.id}`
      }) as NextRequest

      const response = await DELETE(req, { params: Promise.resolve({ todoId: mockTodo.id }) })

      expect(response.status).toBe(200)
      expect(mockPrisma.todo.delete).toHaveBeenCalled()
    })

    it('should reject delete from non-authorized user', async () => {
      const otherUser = createTestUser({ id: 'other-user' })
      mockGetServerSession.mockResolvedValue(mockSession(otherUser))
      
      const todoWithProjectOwner = {
        ...mockTodo,
        creatorId: 'different-creator',
        project: {
          ...mockProject,
          ownerId: 'different-owner',
          owner: { id: 'different-owner' },
          organization: null
        }
      }
      
      mockPrisma.todo.findUnique.mockResolvedValue(todoWithProjectOwner)

      const req = createMockRequest({
        method: 'DELETE',
        url: `/api/todos/${mockTodo.id}`
      }) as NextRequest

      const response = await DELETE(req, { params: Promise.resolve({ todoId: mockTodo.id }) })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Forbidden')
      expect(mockPrisma.todo.delete).not.toHaveBeenCalled()
    })
  })
})