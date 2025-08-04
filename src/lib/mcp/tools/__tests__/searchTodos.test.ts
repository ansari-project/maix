import { handleSearchTodos } from '../searchTodos'
import { prisma } from '@/lib/prisma'
import { canViewTodos } from '@/lib/permissions/todo-permissions'
import type { User } from '@prisma/client'

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    todo: {
      findMany: jest.fn(),
    },
    project: {
      findMany: jest.fn(),
    },
  },
}))

jest.mock('@/lib/permissions/todo-permissions', () => ({
  canViewTodos: jest.fn(),
}))

const mockPrisma = prisma as jest.Mocked<typeof prisma>
const mockCanViewTodos = canViewTodos as jest.MockedFunction<typeof canViewTodos>

describe('handleSearchTodos', () => {
  const mockUser: User = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    username: null,
    image: null,
    bio: null,
    linkedinUrl: null,
    githubUrl: null,
    portfolioUrl: null,
    availability: null,
    skills: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const mockContext = { user: mockUser }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('search with projectId', () => {
    it('should search todos for a specific project', async () => {
      mockCanViewTodos.mockResolvedValue(true)
      
      const mockTodos = [
        {
          id: 'todo-1',
          title: 'First Todo',
          status: 'OPEN',
          dueDate: null,
          creator: { name: 'Creator 1', email: 'creator1@example.com' },
          assignee: null,
          project: { name: 'Test Project' }
        },
        {
          id: 'todo-2',
          title: 'Second Todo',
          status: 'IN_PROGRESS',
          dueDate: new Date('2024-12-31'),
          creator: { name: 'Creator 2', email: 'creator2@example.com' },
          assignee: { name: 'Assignee', email: 'assignee@example.com' },
          project: { name: 'Test Project' }
        }
      ]

      mockPrisma.todo.findMany.mockResolvedValue(mockTodos)

      const result = await handleSearchTodos({
        projectId: 'project-1'
      }, mockContext)

      expect(mockCanViewTodos).toHaveBeenCalledWith('user-1', 'project-1')
      expect(mockPrisma.todo.findMany).toHaveBeenCalledWith({
        where: { projectId: 'project-1' },
        include: {
          creator: { select: { name: true, email: true } },
          assignee: { select: { name: true, email: true } },
          project: { select: { name: true } }
        },
        orderBy: [
          { dueDate: "asc" },
          { status: "asc" },
          { createdAt: "desc" }
        ],
        take: 20,
        skip: 0
      })

      expect(result).toContain('Found 2 todo(s):')
      expect(result).toContain('First Todo')
      expect(result).toContain('Second Todo')
    })

    it('should throw error when user lacks permission for specific project', async () => {
      mockCanViewTodos.mockResolvedValue(false)

      await expect(handleSearchTodos({
        projectId: 'project-1'
      }, mockContext)).rejects.toThrow("You don't have permission to view todos for this project.")
    })
  })

  describe('search without projectId', () => {
    it('should search todos across all accessible projects', async () => {
      const mockProjects = [
        { id: 'project-1' },
        { id: 'project-2' }
      ]

      const mockTodos = [
        {
          id: 'todo-1',
          title: 'Cross-project Todo',
          status: 'OPEN',
          dueDate: null,
          creator: { name: 'Creator', email: 'creator@example.com' },
          assignee: null,
          project: { name: 'Project 1' }
        }
      ]

      mockPrisma.project.findMany.mockResolvedValue(mockProjects)
      mockPrisma.todo.findMany.mockResolvedValue(mockTodos)

      const result = await handleSearchTodos({}, mockContext)

      expect(mockPrisma.project.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { ownerId: 'user-1' },
            { 
              applications: {
                some: {
                  userId: 'user-1',
                  status: "ACCEPTED"
                }
              }
            }
          ]
        },
        select: { id: true }
      })

      expect(mockPrisma.todo.findMany).toHaveBeenCalledWith({
        where: {
          projectId: {
            in: ['project-1', 'project-2']
          }
        },
        include: {
          creator: { select: { name: true, email: true } },
          assignee: { select: { name: true, email: true } },
          project: { select: { name: true } }
        },
        orderBy: [
          { dueDate: "asc" },
          { status: "asc" },
          { createdAt: "desc" }
        ],
        take: 20,
        skip: 0
      })

      expect(result).toContain('Found 1 todo(s):')
      expect(result).toContain('Cross-project Todo')
    })

    it('should return message when user has no accessible projects', async () => {
      mockPrisma.project.findMany.mockResolvedValue([])

      const result = await handleSearchTodos({}, mockContext)

      expect(result).toBe("No todos found - you don't have access to any projects.")
    })
  })

  describe('search with filters', () => {
    beforeEach(() => {
      const mockProjects = [{ id: 'project-1' }]
      mockPrisma.project.findMany.mockResolvedValue(mockProjects)
    })

    it('should filter by status', async () => {
      mockPrisma.todo.findMany.mockResolvedValue([])

      await handleSearchTodos({
        status: ['OPEN', 'IN_PROGRESS']
      }, mockContext)

      expect(mockPrisma.todo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { in: ['OPEN', 'IN_PROGRESS'] }
          })
        })
      )
    })

    it('should filter by assignee', async () => {
      mockPrisma.todo.findMany.mockResolvedValue([])

      await handleSearchTodos({
        assigneeId: 'assignee-1'
      }, mockContext)

      expect(mockPrisma.todo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            assigneeId: 'assignee-1'
          })
        })
      )
    })

    it('should filter by creator', async () => {
      mockPrisma.todo.findMany.mockResolvedValue([])

      await handleSearchTodos({
        creatorId: 'creator-1'
      }, mockContext)

      expect(mockPrisma.todo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            creatorId: 'creator-1'
          })
        })
      )
    })

    it('should filter by query text', async () => {
      mockPrisma.todo.findMany.mockResolvedValue([])

      await handleSearchTodos({
        query: 'test search'
      }, mockContext)

      expect(mockPrisma.todo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { title: { contains: 'test search', mode: 'insensitive' } },
              { description: { contains: 'test search', mode: 'insensitive' } }
            ]
          })
        })
      )
    })

    it('should filter todos due soon', async () => {
      mockPrisma.todo.findMany.mockResolvedValue([])

      const now = new Date()
      const nextWeek = new Date()
      nextWeek.setDate(now.getDate() + 7)

      await handleSearchTodos({
        dueSoon: true
      }, mockContext)

      const callArgs = mockPrisma.todo.findMany.mock.calls[0][0]
      expect(callArgs.where.dueDate).toHaveProperty('gte')
      expect(callArgs.where.dueDate).toHaveProperty('lte')
    })

    it('should filter overdue todos', async () => {
      mockPrisma.todo.findMany.mockResolvedValue([])

      await handleSearchTodos({
        overdue: true
      }, mockContext)

      const callArgs = mockPrisma.todo.findMany.mock.calls[0][0]
      expect(callArgs.where.dueDate).toHaveProperty('lt')
      expect(callArgs.where.status).toEqual({ not: "COMPLETED" })
    })
  })

  describe('pagination', () => {
    beforeEach(() => {
      const mockProjects = [{ id: 'project-1' }]
      mockPrisma.project.findMany.mockResolvedValue(mockProjects)
      mockPrisma.todo.findMany.mockResolvedValue([])
    })

    it('should apply limit and offset', async () => {
      await handleSearchTodos({
        limit: 10,
        offset: 5
      }, mockContext)

      expect(mockPrisma.todo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 5
        })
      )
    })

    it('should use default limit when not specified', async () => {
      await handleSearchTodos({}, mockContext)

      expect(mockPrisma.todo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 20,
          skip: 0
        })
      )
    })
  })

  describe('result formatting', () => {
    beforeEach(() => {
      const mockProjects = [{ id: 'project-1' }]
      mockPrisma.project.findMany.mockResolvedValue(mockProjects)
    })

    it('should format overdue todos with warning', async () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)

      const mockTodos = [
        {
          id: 'todo-1',
          title: 'Overdue Todo',
          status: 'OPEN',
          dueDate: yesterday,
          creator: { name: 'Creator', email: 'creator@example.com' },
          assignee: null,
          project: { name: 'Test Project' }
        }
      ]

      mockPrisma.todo.findMany.mockResolvedValue(mockTodos)

      const result = await handleSearchTodos({}, mockContext)

      expect(result).toContain('🚨 OVERDUE')
    })

    it('should return appropriate message when no todos found with filters', async () => {
      mockPrisma.todo.findMany.mockResolvedValue([])

      const result = await handleSearchTodos({
        query: 'nonexistent',
        status: ['COMPLETED'],
        dueSoon: true
      }, mockContext)

      expect(result).toContain('No todos found matching "nonexistent" with status COMPLETED due soon.')
    })
  })
})