import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'

// Mock dependencies first
jest.mock('next-auth')
jest.mock('@/lib/prisma')
jest.mock('@/lib/services/project.service')

// Import routes after mocks
import { GET, POST } from '../personal/route'

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>

describe('/api/projects/personal', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/projects/personal', () => {
    it('should return 401 when not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/projects/personal')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return personal projects', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' }
      } as any)

      const mockProjects = [
        {
          id: 'proj-1',
          name: 'Home Tasks',
          isPersonal: true,
          personalCategory: 'home'
        },
        {
          id: 'proj-2',
          name: 'Work Projects',
          isPersonal: true,
          personalCategory: 'work'
        }
      ]

      const projectService = require('@/lib/services/project.service')
      projectService.getPersonalProjects.mockResolvedValue(mockProjects)

      const request = new NextRequest('http://localhost:3000/api/projects/personal')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(mockProjects)
      expect(projectService.getPersonalProjects).toHaveBeenCalledWith('user-123', {})
    })

    it('should pass includeShared parameter', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' }
      } as any)

      const projectService = require('@/lib/services/project.service')
      projectService.getPersonalProjects.mockResolvedValue([])

      const request = new NextRequest('http://localhost:3000/api/projects/personal?includeShared=true')
      const response = await GET(request)

      expect(response.status).toBe(200)
      expect(projectService.getPersonalProjects).toHaveBeenCalledWith('user-123', {
        includeShared: true
      })
    })

    it('should filter by category', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' }
      } as any)

      const projectService = require('@/lib/services/project.service')
      projectService.getPersonalProjects.mockResolvedValue([])

      const request = new NextRequest('http://localhost:3000/api/projects/personal?category=home')
      const response = await GET(request)

      expect(response.status).toBe(200)
      expect(projectService.getPersonalProjects).toHaveBeenCalledWith('user-123', {
        category: 'home'
      })
    })
  })

  describe('POST /api/projects/personal', () => {
    it('should return 401 when not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/projects/personal', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test' })
      })
      
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should create personal project successfully', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' }
      } as any)

      const mockProject = {
        id: 'proj-123',
        name: 'Personal Project',
        description: 'My personal tasks',
        isPersonal: true,
        personalCategory: 'home',
        ownerId: 'user-123'
      }

      const projectService = require('@/lib/services/project.service')
      projectService.createPersonalProjectSchema.parse = jest.fn().mockReturnValue({
        name: 'Personal Project',
        description: 'My personal tasks',
        personalCategory: 'home'
      })
      projectService.createPersonalProject.mockResolvedValue(mockProject)

      const request = {
        json: jest.fn().mockResolvedValue({
          name: 'Personal Project',
          description: 'My personal tasks',
          personalCategory: 'home'
        })
      } as unknown as NextRequest

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data).toEqual(mockProject)
      expect(projectService.createPersonalProject).toHaveBeenCalledWith('user-123', {
        name: 'Personal Project',
        description: 'My personal tasks',
        personalCategory: 'home'
      })
    })

    it('should handle validation errors', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' }
      } as any)

      const projectService = require('@/lib/services/project.service')
      projectService.createPersonalProjectSchema.parse = jest.fn().mockImplementation(() => {
        const { ZodError } = require('zod')
        throw new ZodError([
          {
            path: ['name'],
            message: 'Required',
            code: 'invalid_type',
            expected: 'string',
            received: 'undefined'
          }
        ])
      })

      const request = {
        json: jest.fn().mockResolvedValue({})
      } as unknown as NextRequest

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid data')
      expect(data.details).toBeDefined()
    })
  })
})