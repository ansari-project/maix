import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'
import { NextRequest } from 'next/server'
import { GET } from '../my-tasks/route'
import { setupTestDatabase, cleanupTestDatabase, createTestUser } from '@/lib/test/db-test-utils'
import { prisma } from '@/lib/prisma'
import { TodoStatus, ProjectStatus, HelpType } from '@prisma/client'
import { getServerSession } from 'next-auth'

// Mock next-auth
jest.mock('next-auth')
const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>

describe('GET /api/todos/my-tasks Integration', () => {
  let testUser: any
  let testProject: any

  beforeAll(async () => {
    await setupTestDatabase()
    
    // Create test user
    testUser = await createTestUser({
      email: 'todo-test@example.com',
      name: 'Todo Test User',
    })

    // Create test project
    testProject = await prisma.project.create({
      data: {
        name: 'Test Project',
        description: 'Test project for todos',
        ownerId: testUser.id,
        status: ProjectStatus.AWAITING_VOLUNTEERS,
        helpType: HelpType.MVP,
        isPersonal: false,
      }
    })
  })

  afterAll(async () => {
    await cleanupTestDatabase()
  })

  it('should return 401 when not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null)

    const request = new NextRequest('http://localhost:3000/api/todos/my-tasks')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('should return tasks assigned to user', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: testUser.id, email: testUser.email }
    } as any)

    // Create test todos
    const todo1 = await prisma.todo.create({
      data: {
        title: 'Assigned Task',
        status: TodoStatus.NOT_STARTED,
        assigneeId: testUser.id,
        creatorId: testUser.id,
        projectId: testProject.id,
      }
    })

    const todo2 = await prisma.todo.create({
      data: {
        title: 'Created Task',
        status: TodoStatus.IN_PROGRESS,
        creatorId: testUser.id,
        projectId: testProject.id,
      }
    })

    const request = new NextRequest('http://localhost:3000/api/todos/my-tasks')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(Array.isArray(data)).toBe(true)
    expect(data.length).toBeGreaterThanOrEqual(2)
    
    const taskTitles = data.map((t: any) => t.title)
    expect(taskTitles).toContain('Assigned Task')
    expect(taskTitles).toContain('Created Task')
  })

  it('should return grouped tasks when grouped=true', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: testUser.id, email: testUser.email }
    } as any)

    // Create standalone task
    await prisma.todo.create({
      data: {
        title: 'Standalone Task',
        status: TodoStatus.NOT_STARTED,
        assigneeId: testUser.id,
        creatorId: testUser.id,
        projectId: null,
      }
    })

    const request = new NextRequest('http://localhost:3000/api/todos/my-tasks?grouped=true')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(Array.isArray(data)).toBe(true)
    
    // Should have at least standalone group and project group
    const standaloneGroup = data.find((g: any) => g.projectId === null)
    expect(standaloneGroup).toBeDefined()
    expect(standaloneGroup.projectName).toBe('Standalone Tasks')
    
    const projectGroup = data.find((g: any) => g.projectId === testProject.id)
    expect(projectGroup).toBeDefined()
    expect(projectGroup.projectName).toBe(testProject.name)
  })

  it('should filter completed tasks when includeCompleted=false', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: testUser.id, email: testUser.email }
    } as any)

    // Create completed task
    await prisma.todo.create({
      data: {
        title: 'Completed Task',
        status: TodoStatus.COMPLETED,
        assigneeId: testUser.id,
        creatorId: testUser.id,
        projectId: testProject.id,
      }
    })

    const request = new NextRequest('http://localhost:3000/api/todos/my-tasks?includeCompleted=false')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    const taskTitles = data.map((t: any) => t.title)
    expect(taskTitles).not.toContain('Completed Task')
  })

  it('should include completed tasks when includeCompleted=true', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: testUser.id, email: testUser.email }
    } as any)

    const request = new NextRequest('http://localhost:3000/api/todos/my-tasks?includeCompleted=true')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    const taskTitles = data.map((t: any) => t.title)
    expect(taskTitles).toContain('Completed Task')
  })

  it('should filter by projectId when provided', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: testUser.id, email: testUser.email }
    } as any)

    // Create another project
    const otherProject = await prisma.project.create({
      data: {
        name: 'Other Project',
        description: 'Another test project',
        ownerId: testUser.id,
        status: ProjectStatus.AWAITING_VOLUNTEERS,
        helpType: HelpType.MVP,
        isPersonal: false,
      }
    })

    await prisma.todo.create({
      data: {
        title: 'Other Project Task',
        status: TodoStatus.NOT_STARTED,
        assigneeId: testUser.id,
        creatorId: testUser.id,
        projectId: otherProject.id,
      }
    })

    const request = new NextRequest(`http://localhost:3000/api/todos/my-tasks?projectId=${testProject.id}`)
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    const taskTitles = data.map((t: any) => t.title)
    expect(taskTitles).not.toContain('Other Project Task')
    expect(taskTitles).toContain('Assigned Task')
  })
})