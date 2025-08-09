import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'

// Mock dependencies first, before importing the route
jest.mock('next-auth')
jest.mock('@/lib/prisma')
jest.mock('@/lib/services/todo.service')

// Import route after mocks are set up
import { GET } from '../my-tasks/route'

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>

describe('GET /api/todos/my-tasks', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return 401 when not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null)

    const request = new NextRequest('http://localhost:3000/api/todos/my-tasks')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('should return flat tasks list by default', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user-123', email: 'test@example.com' }
    } as any)

    const mockTasks = [
      { id: 'task-1', title: 'Task 1', status: 'NOT_STARTED' },
      { id: 'task-2', title: 'Task 2', status: 'IN_PROGRESS' }
    ]

    const todoService = require('@/lib/services/todo.service')
    todoService.getMyTasks.mockResolvedValue(mockTasks)

    const request = {
      nextUrl: {
        searchParams: new URLSearchParams()
      }
    } as unknown as NextRequest
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual(mockTasks)
    expect(todoService.getMyTasks).toHaveBeenCalledWith('user-123', {
      includeCompleted: false,
      projectId: undefined,
    })
  })

  it('should return grouped tasks when grouped=true', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user-123', email: 'test@example.com' }
    } as any)

    const mockGroupedTasks = [
      {
        projectId: null,
        projectName: 'Standalone Tasks',
        isPersonal: false,
        tasks: [{ id: 'task-1', title: 'Standalone', status: 'NOT_STARTED' }]
      },
      {
        projectId: 'proj-1',
        projectName: 'Project 1',
        isPersonal: true,
        tasks: [{ id: 'task-2', title: 'Project task', status: 'IN_PROGRESS' }]
      }
    ]

    const todoService = require('@/lib/services/todo.service')
    todoService.getMyTasksGrouped.mockResolvedValue(mockGroupedTasks)

    const searchParams = new URLSearchParams()
    searchParams.set('grouped', 'true')
    const request = {
      nextUrl: {
        searchParams
      }
    } as unknown as NextRequest
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual(mockGroupedTasks)
    expect(todoService.getMyTasksGrouped).toHaveBeenCalledWith('user-123', {
      includeCompleted: false,
    })
  })

  it('should pass includeCompleted parameter', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user-123', email: 'test@example.com' }
    } as any)

    const todoService = require('@/lib/services/todo.service')
    todoService.getMyTasks.mockResolvedValue([])

    const searchParams = new URLSearchParams()
    searchParams.set('includeCompleted', 'true')
    const request = {
      nextUrl: {
        searchParams
      }
    } as unknown as NextRequest
    const response = await GET(request)

    expect(response.status).toBe(200)
    expect(todoService.getMyTasks).toHaveBeenCalledWith('user-123', {
      includeCompleted: true,
      projectId: undefined,
    })
  })

  it('should filter by projectId when provided', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user-123', email: 'test@example.com' }
    } as any)

    const todoService = require('@/lib/services/todo.service')
    todoService.getMyTasks.mockResolvedValue([])

    const searchParams = new URLSearchParams()
    searchParams.set('projectId', 'proj-123')
    const request = {
      nextUrl: {
        searchParams
      }
    } as unknown as NextRequest
    const response = await GET(request)

    expect(response.status).toBe(200)
    expect(todoService.getMyTasks).toHaveBeenCalledWith('user-123', {
      includeCompleted: false,
      projectId: 'proj-123',
    })
  })

  it('should handle service errors gracefully', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user-123', email: 'test@example.com' }
    } as any)

    const todoService = require('@/lib/services/todo.service')
    todoService.getMyTasks.mockRejectedValue(new Error('Database error'))

    const request = {
      nextUrl: {
        searchParams: new URLSearchParams()
      }
    } as unknown as NextRequest
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to fetch tasks')
  })
})