import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { TodoStatus } from '@prisma/client'
import {
  createTodo,
  createStandaloneTask,
  updateTodoStatus,
  getMyTasks,
  getMyTasksGrouped,
  moveTaskToProject,
} from '../todo.service'

// Mock Prisma
jest.mock('@prisma/client', () => {
  const mockPrisma = {
    todo: {
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    project: {
      findUnique: jest.fn(),
    },
  }
  
  return {
    PrismaClient: jest.fn(() => mockPrisma),
    TodoStatus: {
      NOT_STARTED: 'NOT_STARTED',
      OPEN: 'OPEN',
      IN_PROGRESS: 'IN_PROGRESS',
      WAITING_FOR: 'WAITING_FOR',
      COMPLETED: 'COMPLETED',
      DONE: 'DONE',
    },
  }
})

describe('Todo Service', () => {
  const mockUserId = 'user-123'
  const mockProjectId = 'project-456'
  const mockTodoId = 'todo-789'

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('createTodo', () => {
    it('should create a todo with all fields', async () => {
      const mockTodo = {
        id: mockTodoId,
        title: 'Test Todo',
        status: TodoStatus.NOT_STARTED,
        creatorId: mockUserId,
      }

      const { PrismaClient } = require('@prisma/client')
      const prisma = new PrismaClient()
      prisma.todo.create.mockResolvedValue(mockTodo)

      const result = await createTodo(mockUserId, {
        title: 'Test Todo',
        description: 'Test description',
        projectId: mockProjectId,
        startDate: new Date('2025-02-01'),
        dueDate: new Date('2025-02-28'),
      })

      expect(prisma.todo.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: 'Test Todo',
          creatorId: mockUserId,
        }),
        include: expect.any(Object),
      })
      expect(result).toEqual(mockTodo)
    })
  })

  describe('createStandaloneTask', () => {
    it('should create a task without project', async () => {
      const mockTodo = {
        id: mockTodoId,
        title: 'Standalone Task',
        projectId: null,
        creatorId: mockUserId,
      }

      const { PrismaClient } = require('@prisma/client')
      const prisma = new PrismaClient()
      prisma.todo.create.mockResolvedValue(mockTodo)

      const result = await createStandaloneTask(mockUserId, {
        title: 'Standalone Task',
        description: 'No project',
      })

      expect(prisma.todo.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: 'Standalone Task',
          projectId: undefined,
          eventId: undefined,
        }),
        include: expect.any(Object),
      })
      expect(result.projectId).toBeNull()
    })
  })

  describe('updateTodoStatus', () => {
    it('should update status when user is creator', async () => {
      const mockTodo = {
        id: mockTodoId,
        creatorId: mockUserId,
        status: TodoStatus.NOT_STARTED,
      }

      const { PrismaClient } = require('@prisma/client')
      const prisma = new PrismaClient()
      prisma.todo.findUnique.mockResolvedValue(mockTodo)
      prisma.todo.update.mockResolvedValue({
        ...mockTodo,
        status: TodoStatus.IN_PROGRESS,
      })

      const result = await updateTodoStatus(
        mockTodoId,
        TodoStatus.IN_PROGRESS,
        mockUserId
      )

      expect(prisma.todo.update).toHaveBeenCalledWith({
        where: { id: mockTodoId },
        data: { status: TodoStatus.IN_PROGRESS },
        include: expect.any(Object),
      })
      expect(result.status).toBe(TodoStatus.IN_PROGRESS)
    })

    it('should throw error when user lacks permission', async () => {
      const mockTodo = {
        id: mockTodoId,
        creatorId: 'other-user',
        assigneeId: 'another-user',
        project: null,
      }

      const { PrismaClient } = require('@prisma/client')
      const prisma = new PrismaClient()
      prisma.todo.findUnique.mockResolvedValue(mockTodo)

      await expect(
        updateTodoStatus(mockTodoId, TodoStatus.IN_PROGRESS, mockUserId)
      ).rejects.toThrow('Unauthorized')
    })
  })

  describe('getMyTasks', () => {
    it('should get tasks assigned to or created by user', async () => {
      const mockTasks = [
        { id: '1', assigneeId: mockUserId },
        { id: '2', creatorId: mockUserId, assigneeId: null },
      ]

      const { PrismaClient } = require('@prisma/client')
      const prisma = new PrismaClient()
      prisma.todo.findMany.mockResolvedValue(mockTasks)

      const result = await getMyTasks(mockUserId)

      expect(prisma.todo.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { assigneeId: mockUserId },
            { creatorId: mockUserId, assigneeId: null },
          ],
          status: { notIn: [TodoStatus.COMPLETED, TodoStatus.DONE] },
        },
        include: expect.any(Object),
        orderBy: expect.any(Array),
      })
      expect(result).toEqual(mockTasks)
    })

    it('should include completed tasks when specified', async () => {
      const { PrismaClient } = require('@prisma/client')
      const prisma = new PrismaClient()
      prisma.todo.findMany.mockResolvedValue([])

      await getMyTasks(mockUserId, { includeCompleted: true })

      expect(prisma.todo.findMany).toHaveBeenCalledWith({
        where: {
          OR: expect.any(Array),
        },
        include: expect.any(Object),
        orderBy: expect.any(Array),
      })
    })
  })

  describe('getMyTasksGrouped', () => {
    it('should group tasks by project', async () => {
      const mockTasks = [
        {
          id: '1',
          projectId: null,
          project: null,
        },
        {
          id: '2',
          projectId: 'proj-1',
          project: { id: 'proj-1', name: 'Project 1', isPersonal: false },
        },
        {
          id: '3',
          projectId: 'proj-1',
          project: { id: 'proj-1', name: 'Project 1', isPersonal: false },
        },
      ]

      const { PrismaClient } = require('@prisma/client')
      const prisma = new PrismaClient()
      prisma.todo.findMany.mockResolvedValue(mockTasks)

      const result = await getMyTasksGrouped(mockUserId)

      expect(result).toHaveLength(2)
      expect(result[0].projectName).toBe('Standalone Tasks')
      expect(result[0].tasks).toHaveLength(1)
      expect(result[1].projectName).toBe('Project 1')
      expect(result[1].tasks).toHaveLength(2)
    })
  })

  describe('moveTaskToProject', () => {
    it('should move task to new project', async () => {
      const mockTodo = {
        id: mockTodoId,
        creatorId: mockUserId,
        projectId: 'old-project',
      }

      const mockNewProject = {
        id: 'new-project',
        ownerId: mockUserId,
        members: [],
      }

      const { PrismaClient } = require('@prisma/client')
      const prisma = new PrismaClient()
      prisma.todo.findUnique.mockResolvedValue(mockTodo)
      prisma.project.findUnique.mockResolvedValue(mockNewProject)
      prisma.todo.update.mockResolvedValue({
        ...mockTodo,
        projectId: 'new-project',
      })

      const result = await moveTaskToProject(
        mockTodoId,
        'new-project',
        mockUserId
      )

      expect(prisma.todo.update).toHaveBeenCalledWith({
        where: { id: mockTodoId },
        data: { projectId: 'new-project' },
        include: expect.any(Object),
      })
      expect(result.projectId).toBe('new-project')
    })

    it('should make task standalone when projectId is null', async () => {
      const mockTodo = {
        id: mockTodoId,
        creatorId: mockUserId,
        projectId: 'old-project',
      }

      const { PrismaClient } = require('@prisma/client')
      const prisma = new PrismaClient()
      prisma.todo.findUnique.mockResolvedValue(mockTodo)
      prisma.todo.update.mockResolvedValue({
        ...mockTodo,
        projectId: null,
      })

      const result = await moveTaskToProject(mockTodoId, null, mockUserId)

      expect(prisma.todo.update).toHaveBeenCalledWith({
        where: { id: mockTodoId },
        data: { projectId: null },
        include: expect.any(Object),
      })
      expect(result.projectId).toBeNull()
    })
  })
})