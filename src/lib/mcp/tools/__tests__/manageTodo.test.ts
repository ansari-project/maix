import { handleManageTodo } from '../manageTodo'
import { prisma } from '@/lib/prisma'
import { canManageTodos, canViewTodos } from '@/lib/permissions/todo-permissions'
import type { User } from '@prisma/client'

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    todo: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}))

jest.mock('@/lib/permissions/todo-permissions', () => ({
  canManageTodos: jest.fn(),
  canViewTodos: jest.fn(),
}))

const mockPrisma = prisma as jest.Mocked<typeof prisma>
const mockCanManageTodos = canManageTodos as jest.MockedFunction<typeof canManageTodos>
const mockCanViewTodos = canViewTodos as jest.MockedFunction<typeof canViewTodos>

describe('handleManageTodo', () => {
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

  describe('create action', () => {
    it('should create a todo successfully', async () => {
      mockCanManageTodos.mockResolvedValue(true)
      
      const mockTodo = {
        id: 'todo-1',
        title: 'Test Todo',
        description: 'Test description',
        status: 'OPEN',
        projectId: 'project-1',
        creatorId: 'user-1',
        assigneeId: null,
        dueDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        creator: { name: 'Test User', email: 'test@example.com' },
        assignee: null,
        project: { name: 'Test Project' }
      }

      mockPrisma.todo.create.mockResolvedValue(mockTodo)

      const result = await handleManageTodo({
        action: 'create',
        projectId: 'project-1',
        title: 'Test Todo',
        description: 'Test description'
      }, mockContext)

      expect(mockCanManageTodos).toHaveBeenCalledWith('user-1', 'project-1')
      expect(mockPrisma.todo.create).toHaveBeenCalledWith({
        data: {
          title: 'Test Todo',
          description: 'Test description',
          status: 'OPEN',
          projectId: 'project-1',
          creatorId: 'user-1',
          assigneeId: null,
          dueDate: null,
        },
        include: {
          creator: { select: { name: true, email: true } },
          assignee: { select: { name: true, email: true } },
          project: { select: { name: true } }
        }
      })

      expect(result).toBe('Todo "Test Todo" created successfully in project "Test Project" (unassigned). ID: todo-1')
    })

    it('should throw error when user lacks permission', async () => {
      mockCanManageTodos.mockResolvedValue(false)

      await expect(handleManageTodo({
        action: 'create',
        projectId: 'project-1',
        title: 'Test Todo'
      }, mockContext)).rejects.toThrow("You don't have permission to create todos for this project.")
    })

    it('should throw error when required fields are missing', async () => {
      await expect(handleManageTodo({
        action: 'create'
      }, mockContext)).rejects.toThrow("Project ID and title are required for creating a todo.")
    })
  })

  describe('list action', () => {
    it('should list todos for a project', async () => {
      mockCanViewTodos.mockResolvedValue(true)
      
      const mockTodos = [
        {
          id: 'todo-1',
          title: 'Todo 1',
          status: 'OPEN',
          dueDate: null,
          creator: { name: 'User 1', email: 'user1@example.com' },
          assignee: null
        },
        {
          id: 'todo-2',
          title: 'Todo 2',
          status: 'IN_PROGRESS',
          dueDate: new Date('2024-12-31'),
          creator: { name: 'User 2', email: 'user2@example.com' },
          assignee: { name: 'Assignee', email: 'assignee@example.com' }
        }
      ]

      mockPrisma.todo.findMany.mockResolvedValue(mockTodos)

      const result = await handleManageTodo({
        action: 'list',
        projectId: 'project-1'
      }, mockContext)

      expect(mockCanViewTodos).toHaveBeenCalledWith('user-1', 'project-1')
      expect(result).toContain('Todo 1')
      expect(result).toContain('Todo 2')
      expect(result).toContain('(unassigned)')
      expect(result).toContain('(assigned to Assignee)')
    })

    it('should return message when no todos found', async () => {
      mockCanViewTodos.mockResolvedValue(true)
      mockPrisma.todo.findMany.mockResolvedValue([])

      const result = await handleManageTodo({
        action: 'list',
        projectId: 'project-1'
      }, mockContext)

      expect(result).toBe('No todos found for this project.')
    })

    it('should throw error when user lacks permission', async () => {
      mockCanViewTodos.mockResolvedValue(false)

      await expect(handleManageTodo({
        action: 'list',
        projectId: 'project-1'
      }, mockContext)).rejects.toThrow("You don't have permission to view todos for this project.")
    })
  })

  describe('get action', () => {
    it('should get a specific todo', async () => {
      mockCanViewTodos.mockResolvedValue(true)
      
      const mockTodo = {
        id: 'todo-1',
        title: 'Test Todo',
        description: 'Test description',
        status: 'OPEN',
        projectId: 'project-1',
        dueDate: new Date('2024-12-31'),
        createdAt: new Date('2024-01-01'),
        creator: { name: 'Creator', email: 'creator@example.com' },
        assignee: { name: 'Assignee', email: 'assignee@example.com' },
        project: { name: 'Test Project', ownerId: 'user-1' }
      }

      mockPrisma.todo.findUnique.mockResolvedValue(mockTodo)

      const result = await handleManageTodo({
        action: 'get',
        todoId: 'todo-1'
      }, mockContext)

      expect(result).toContain('Todo Details:')
      expect(result).toContain('Title: Test Todo')
      expect(result).toContain('Assigned to: Assignee')
      expect(result).toContain('Project: Test Project')
    })

    it('should throw error when todo not found', async () => {
      mockPrisma.todo.findUnique.mockResolvedValue(null)

      await expect(handleManageTodo({
        action: 'get',
        todoId: 'todo-1'
      }, mockContext)).rejects.toThrow('Todo not found.')
    })
  })

  describe('update action', () => {
    it('should update a todo successfully', async () => {
      const existingTodo = {
        id: 'todo-1',
        projectId: 'project-1',
        project: { name: 'Test Project' }
      }

      const updatedTodo = {
        ...existingTodo,
        title: 'Updated Todo',
        assignee: null,
        project: { name: 'Test Project' }
      }

      mockPrisma.todo.findUnique.mockResolvedValue(existingTodo)
      mockCanManageTodos.mockResolvedValue(true)
      mockPrisma.todo.update.mockResolvedValue(updatedTodo)

      const result = await handleManageTodo({
        action: 'update',
        todoId: 'todo-1',
        title: 'Updated Todo'
      }, mockContext)

      expect(result).toBe('Todo "Updated Todo" updated successfully in project "Test Project".')
    })

    it('should throw error when user lacks permission', async () => {
      const existingTodo = {
        id: 'todo-1',
        projectId: 'project-1',
        project: { name: 'Test Project' }
      }

      mockPrisma.todo.findUnique.mockResolvedValue(existingTodo)
      mockCanManageTodos.mockResolvedValue(false)

      await expect(handleManageTodo({
        action: 'update',
        todoId: 'todo-1',
        title: 'Updated Todo'
      }, mockContext)).rejects.toThrow("You don't have permission to update this todo.")
    })
  })

  describe('delete action', () => {
    it('should delete a todo successfully', async () => {
      const existingTodo = {
        id: 'todo-1',
        title: 'Todo to Delete',
        projectId: 'project-1',
        project: { name: 'Test Project' }
      }

      mockPrisma.todo.findUnique.mockResolvedValue(existingTodo)
      mockCanManageTodos.mockResolvedValue(true)
      mockPrisma.todo.delete.mockResolvedValue(existingTodo)

      const result = await handleManageTodo({
        action: 'delete',
        todoId: 'todo-1'
      }, mockContext)

      expect(result).toBe('Todo "Todo to Delete" deleted successfully from project "Test Project".')
    })

    it('should throw error when user lacks permission', async () => {
      const existingTodo = {
        id: 'todo-1',
        projectId: 'project-1',
        project: { name: 'Test Project' }
      }

      mockPrisma.todo.findUnique.mockResolvedValue(existingTodo)
      mockCanManageTodos.mockResolvedValue(false)

      await expect(handleManageTodo({
        action: 'delete',
        todoId: 'todo-1'
      }, mockContext)).rejects.toThrow("You don't have permission to delete this todo.")
    })
  })

  describe('invalid action', () => {
    it('should throw error for invalid action', async () => {
      await expect(handleManageTodo({
        action: 'invalid' as any
      }, mockContext)).rejects.toThrow('Invalid action. Use: create, update, get, list, or delete.')
    })
  })
})