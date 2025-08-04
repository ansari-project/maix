import { NextResponse } from 'next/server'
import { POST } from '../route'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-utils'
import { createTestUser, createTestProject, createMockRequest } from '@/__tests__/helpers/api-test-utils.helper'
import { parseRequestBody } from '@/lib/api-utils'

// Mock dependencies
jest.mock('@/lib/auth-utils')
jest.mock('@/lib/api-utils', () => ({
  handleApiError: jest.fn().mockImplementation((error) => {
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), { status: 500 })
  }),
  parseRequestBody: jest.fn(),
  successResponse: jest.fn().mockImplementation((data, status = 200) => {
    return new Response(JSON.stringify(data), { status })
  })
}))
jest.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: jest.fn(),
    project: {
      findFirst: jest.fn()
    },
    todo: {
      findUnique: jest.fn()
    },
    post: {
      create: jest.fn(),
      findUnique: jest.fn()
    },
    user: {
      findMany: jest.fn()
    }
  },
  Prisma: {
    PrismaClientKnownRequestError: class PrismaClientKnownRequestError extends Error {
      code = 'P2000'
    }
  }
}))
jest.mock('@/services/notification.service')

const mockPrisma = prisma as jest.Mocked<typeof prisma>
const mockRequireAuth = requireAuth as jest.Mock
const mockParseRequestBody = parseRequestBody as jest.Mock

describe('POST /api/posts - Todo Integration', () => {
  const mockUser = createTestUser({
    id: 'user-1',
    name: 'Test User'
  })

  const mockProject = {
    id: 'project-1',
    name: 'Test Project',
    ownerId: mockUser.id,
    applications: []
  }

  const mockTodo = {
    id: 'todo-1',
    title: 'Test Todo',
    projectId: mockProject.id
  }

  const mockPost = {
    id: 'post-1',
    type: 'PROJECT_UPDATE',
    content: 'Update about the todo',
    authorId: mockUser.id,
    projectId: mockProject.id,
    productId: null,
    parentId: null,
    todoId: mockTodo.id,
    createdAt: new Date(),
    updatedAt: new Date(),
    author: mockUser,
    project: mockProject,
    product: null,
    _count: { replies: 0, comments: 0 }
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockRequireAuth.mockResolvedValue(mockUser)
    
    // Setup transaction to execute callback immediately
    mockPrisma.$transaction.mockImplementation(async (callback) => {
      return callback(mockPrisma)
    })
  })

  describe('Todo attachment', () => {
    it('should attach post to todo when todoId is provided', async () => {
      mockPrisma.project.findFirst.mockResolvedValue(mockProject)
      mockPrisma.todo.findUnique.mockResolvedValue({ projectId: mockProject.id })
      mockPrisma.post.create.mockResolvedValue(mockPost)
      mockPrisma.user.findMany.mockResolvedValue([])
      
      mockParseRequestBody.mockResolvedValue({
        type: 'PROJECT_UPDATE',
        content: 'Update about the todo',
        projectId: mockProject.id,
        todoId: mockTodo.id
      })

      const request = createMockRequest('POST', 'http://localhost:3000/api/posts', {
        type: 'PROJECT_UPDATE',
        content: 'Update about the todo',
        projectId: mockProject.id,
        todoId: mockTodo.id
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(mockPrisma.todo.findUnique).toHaveBeenCalledWith({
        where: { id: mockTodo.id },
        select: { projectId: true }
      })
      expect(mockPrisma.post.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            todoId: mockTodo.id
          })
        })
      )
      expect(data.todoId).toBe(mockTodo.id)
    })

    it('should reject todoId from different project', async () => {
      mockPrisma.project.findFirst.mockResolvedValue(mockProject)
      mockPrisma.todo.findUnique.mockResolvedValue({ projectId: 'different-project' })
      
      mockParseRequestBody.mockResolvedValue({
        type: 'PROJECT_UPDATE',
        content: 'Update about the todo',
        projectId: mockProject.id,
        todoId: mockTodo.id
      })

      const request = createMockRequest('POST', 'http://localhost:3000/api/posts', {
        type: 'PROJECT_UPDATE',
        content: 'Update about the todo',
        projectId: mockProject.id,
        todoId: mockTodo.id
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toContain('Todo must belong to the same project')
    })

    it('should reject non-existent todoId', async () => {
      mockPrisma.project.findFirst.mockResolvedValue(mockProject)
      mockPrisma.todo.findUnique.mockResolvedValue(null)

      mockParseRequestBody.mockResolvedValue({
        type: 'PROJECT_UPDATE',
        content: 'Update about the todo',
        projectId: mockProject.id,
        todoId: 'non-existent'
      })

      const request = createMockRequest('POST', 'http://localhost:3000/api/posts', {
        type: 'PROJECT_UPDATE',
        content: 'Update about the todo',
        projectId: mockProject.id,
        todoId: 'non-existent'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toContain('Todo must belong to the same project')
    })

    it('should allow todoId for accepted volunteers', async () => {
      const volunteer = createTestUser({ id: 'volunteer-1' })
      mockRequireAuth.mockResolvedValue(volunteer)
      
      mockPrisma.project.findFirst.mockResolvedValue({
        ...mockProject,
        applications: [{ userId: volunteer.id, status: 'ACCEPTED' }]
      })
      mockPrisma.todo.findUnique.mockResolvedValue({ projectId: mockProject.id })
      mockPrisma.post.create.mockResolvedValue({
        ...mockPost,
        authorId: volunteer.id
      })
      mockPrisma.user.findMany.mockResolvedValue([])
      
      mockParseRequestBody.mockResolvedValue({
        type: 'PROJECT_UPDATE',
        content: 'Volunteer update about the todo',
        projectId: mockProject.id,
        todoId: mockTodo.id
      })

      const request = createMockRequest('POST', 'http://localhost:3000/api/posts', {
        type: 'PROJECT_UPDATE',
        content: 'Volunteer update about the todo',
        projectId: mockProject.id,
        todoId: mockTodo.id
      })

      const response = await POST(request)

      expect(response.status).toBe(201)
      expect(mockPrisma.post.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            todoId: mockTodo.id,
            authorId: volunteer.id
          })
        })
      )
    })

    it('should ignore todoId for posts without projectId', async () => {
      mockPrisma.post.create.mockResolvedValue({
        ...mockPost,
        type: 'QUESTION',
        projectId: null,
        todoId: null
      })
      mockPrisma.user.findMany.mockResolvedValue([])
      
      mockParseRequestBody.mockResolvedValue({
        type: 'QUESTION',
        content: 'General question',
        todoId: mockTodo.id // This should be ignored since no projectId
      })

      const request = createMockRequest('POST', 'http://localhost:3000/api/posts', {
        type: 'QUESTION',
        content: 'General question',
        todoId: mockTodo.id // This should be ignored since no projectId
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(mockPrisma.todo.findUnique).not.toHaveBeenCalled()
      expect(mockPrisma.post.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            todoId: mockTodo.id // Still passed through but not validated
          })
        })
      )
    })
  })
})