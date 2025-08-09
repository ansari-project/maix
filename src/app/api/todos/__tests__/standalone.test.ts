import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'

// Mock dependencies first
jest.mock('next-auth')
jest.mock('@/lib/prisma')
jest.mock('@/lib/services/todo.service')

// Import route after mocks
import { POST } from '../standalone/route'

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>

describe('POST /api/todos/standalone', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return 401 when not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null)

    const request = new NextRequest('http://localhost:3000/api/todos/standalone', {
      method: 'POST',
      body: JSON.stringify({ title: 'Test' })
    })
    
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('should create standalone task successfully', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user-123', email: 'test@example.com' }
    } as any)

    const mockTask = {
      id: 'task-123',
      title: 'Standalone Task',
      description: 'Test description',
      status: 'NOT_STARTED',
      projectId: null,
      creatorId: 'user-123'
    }

    const todoService = require('@/lib/services/todo.service')
    const mockParse = jest.fn().mockReturnValue({
      title: 'Standalone Task',
      description: 'Test description',
      status: 'NOT_STARTED'
    })
    todoService.createTodoSchema.omit = jest.fn().mockReturnValue({ parse: mockParse })
    todoService.createStandaloneTask.mockResolvedValue(mockTask)

    const request = {
      json: jest.fn().mockResolvedValue({
        title: 'Standalone Task',
        description: 'Test description'
      })
    } as unknown as NextRequest

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data).toEqual(mockTask)
    expect(todoService.createStandaloneTask).toHaveBeenCalledWith('user-123', {
      title: 'Standalone Task',
      description: 'Test description',
      status: 'NOT_STARTED'
    })
  })

  it('should handle validation errors', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user-123', email: 'test@example.com' }
    } as any)

    const todoService = require('@/lib/services/todo.service')
    const mockParse = jest.fn().mockImplementation(() => {
      const { ZodError } = require('zod')
      throw new ZodError([
        {
          path: ['title'],
          message: 'Required',
          code: 'invalid_type',
          expected: 'string',
          received: 'undefined'
        }
      ])
    })
    todoService.createTodoSchema.omit = jest.fn().mockReturnValue({ parse: mockParse })

    const request = {
      json: jest.fn().mockResolvedValue({})
    } as unknown as NextRequest

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid data')
    expect(data.details).toBeDefined()
  })

  it('should handle service errors', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user-123', email: 'test@example.com' }
    } as any)

    const todoService = require('@/lib/services/todo.service')
    todoService.createTodoSchema.omit = jest.fn().mockReturnValue({ 
      parse: jest.fn().mockReturnValue({ title: 'Test' })
    })
    todoService.createStandaloneTask.mockRejectedValue(new Error('Database error'))

    const request = {
      json: jest.fn().mockResolvedValue({ title: 'Test' })
    } as unknown as NextRequest

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to create task')
  })
})