import { GET } from '../route'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-utils'

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    project: { findMany: jest.fn() },
    application: { findMany: jest.fn() },
    post: { findMany: jest.fn() },
    product: { findMany: jest.fn() },
  },
  Prisma: {
    PrismaClientKnownRequestError: class PrismaClientKnownRequestError extends Error {
      code: string
      constructor(message: string, { code }: { code: string }) {
        super(message)
        this.code = code
      }
    }
  }
}))

jest.mock('@/lib/auth-utils', () => ({
  requireAuth: jest.fn()
}))

jest.mock('@/lib/api-utils', () => ({
  handleApiError: jest.fn((error: any) => {
    if (error.status === 401) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 })
  }),
  successResponse: jest.fn((data: any) => {
    return new Response(JSON.stringify(data), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  })
}))

describe('GET /api/feed', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return 401 if user is not authenticated', async () => {
    const error = new Error('Unauthorized')
    ;(error as any).status = 401
    ;(requireAuth as jest.Mock).mockRejectedValueOnce(error)

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBeDefined()
  })

  it('should return feed items for authenticated user', async () => {
    const mockUser = { id: 'user1', email: 'test@example.com' }
    ;(requireAuth as jest.Mock).mockResolvedValueOnce(mockUser)

    const mockProjects = [
      {
        id: 'proj1',
        name: 'Test Project',
        description: 'Project description',
        projectType: 'OPEN_SOURCE',
        helpType: 'MVP',
        createdAt: new Date('2024-01-01'),
        owner: { id: 'user1', name: 'John Doe' }
      }
    ]


    const mockProductUpdates = [
      {
        id: 'pu1',
        type: 'PRODUCT_UPDATE',
        content: 'Released v2.0',
        createdAt: new Date('2024-01-03'),
        author: { id: 'user3', name: 'Bob Johnson' },
        product: { id: 'prod1', name: 'Test Product' }
      }
    ]

    const mockProducts = [
      {
        id: 'prod1',
        name: 'Test Product',
        description: 'Product description',
        createdAt: new Date('2024-01-04'),
        owner: { id: 'user4', name: 'Alice Brown' },
        _count: { projects: 3 }
      }
    ]

    const mockQuestionAnswers = [
      {
        id: 'q1',
        type: 'QUESTION',
        content: 'How to implement auth?',
        createdAt: new Date('2024-01-05'),
        author: { id: 'user5', name: 'Charlie Davis' },
        parent: null
      },
      {
        id: 'a1',
        type: 'ANSWER',
        content: 'Use NextAuth.js',
        createdAt: new Date('2024-01-06'),
        author: { id: 'user6', name: 'Eve Wilson' },
        parent: {
          id: 'q1',
          content: 'How to implement auth?',
          author: { id: 'user5', name: 'Charlie Davis' }
        }
      }
    ]

    ;(prisma.project.findMany as jest.Mock).mockResolvedValueOnce(mockProjects)
    ;(prisma.post.findMany as jest.Mock)
      .mockResolvedValueOnce(mockProductUpdates) // First call for product updates
      .mockResolvedValueOnce(mockQuestionAnswers) // Second call for questions/answers
    ;(prisma.product.findMany as jest.Mock).mockResolvedValueOnce(mockProducts)

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.items).toBeDefined()
    expect(data.items.length).toBeGreaterThan(0)

    // Check that all types are included
    const types = data.items.map((item: any) => item.type)
    expect(types).toContain('project_created')
    expect(types).toContain('product_update')
    expect(types).toContain('product_created')
    expect(types).toContain('question_asked')
    expect(types).toContain('answer_posted')

    // Check specific item properties
    const projectItem = data.items.find((item: any) => item.type === 'project_created')
    expect(projectItem).toMatchObject({
      id: 'proj1',
      type: 'project_created',
      title: 'New project: Test Project',
      user: { id: 'user1', name: 'John Doe' }
    })

    const questionItem = data.items.find((item: any) => item.type === 'question_asked')
    expect(questionItem).toMatchObject({
      id: 'q1',
      type: 'question_asked',
      title: expect.stringContaining('Charlie Davis asked: How to implement auth?')
    })
  })

  it('should handle empty results gracefully', async () => {
    const mockUser = { id: 'user1', email: 'test@example.com' }
    ;(requireAuth as jest.Mock).mockResolvedValueOnce(mockUser)

    ;(prisma.project.findMany as jest.Mock).mockResolvedValueOnce([])
    ;(prisma.post.findMany as jest.Mock).mockResolvedValue([])
    ;(prisma.product.findMany as jest.Mock).mockResolvedValueOnce([])

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.items).toEqual([])
  })

  it('should filter out posts without authors', async () => {
    const mockUser = { id: 'user1', email: 'test@example.com' }
    ;(requireAuth as jest.Mock).mockResolvedValueOnce(mockUser)

    const mockPosts = [
      {
        id: 'q1',
        type: 'QUESTION',
        content: 'Valid question',
        createdAt: new Date('2024-01-01'),
        author: { id: 'user1', name: 'John' },
        parent: null
      },
      {
        id: 'q2',
        type: 'QUESTION',
        content: 'Invalid question',
        createdAt: new Date('2024-01-02'),
        author: null, // No author
        parent: null
      }
    ]

    ;(prisma.project.findMany as jest.Mock).mockResolvedValueOnce([])
    ;(prisma.application.findMany as jest.Mock).mockResolvedValueOnce([])
    ;(prisma.post.findMany as jest.Mock)
      .mockResolvedValueOnce([]) // Product updates
      .mockResolvedValueOnce(mockPosts) // Questions/answers
    ;(prisma.product.findMany as jest.Mock).mockResolvedValueOnce([])

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.items).toHaveLength(1)
    expect(data.items[0].id).toBe('q1')
  })

  it('should sort items by timestamp descending', async () => {
    const mockUser = { id: 'user1', email: 'test@example.com' }
    ;(requireAuth as jest.Mock).mockResolvedValueOnce(mockUser)

    const mockProjects = [
      {
        id: 'proj1',
        name: 'Old Project',
        createdAt: new Date('2024-01-01'),
        owner: { id: 'user1', name: 'User' }
      },
      {
        id: 'proj2',
        name: 'New Project',
        createdAt: new Date('2024-01-10'),
        owner: { id: 'user2', name: 'User2' }
      }
    ]

    ;(prisma.project.findMany as jest.Mock).mockResolvedValueOnce(mockProjects)
    ;(prisma.application.findMany as jest.Mock).mockResolvedValueOnce([])
    ;(prisma.post.findMany as jest.Mock).mockResolvedValue([])
    ;(prisma.product.findMany as jest.Mock).mockResolvedValueOnce([])

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.items[0].id).toBe('proj2') // Newer item first
    expect(data.items[1].id).toBe('proj1') // Older item second
  })

  it('should limit results to 20 items', async () => {
    const mockUser = { id: 'user1', email: 'test@example.com' }
    ;(requireAuth as jest.Mock).mockResolvedValueOnce(mockUser)

    // Create 25 projects
    const mockProjects = Array.from({ length: 25 }, (_, i) => ({
      id: `proj${i}`,
      name: `Project ${i}`,
      createdAt: new Date(`2024-01-${String(i + 1).padStart(2, '0')}`),
      owner: { id: 'user1', name: 'User' }
    }))

    ;(prisma.project.findMany as jest.Mock).mockResolvedValueOnce(mockProjects)
    ;(prisma.application.findMany as jest.Mock).mockResolvedValueOnce([])
    ;(prisma.post.findMany as jest.Mock).mockResolvedValue([])
    ;(prisma.product.findMany as jest.Mock).mockResolvedValueOnce([])

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.items).toHaveLength(20) // Should be limited to 20
  })

  it('should handle database errors gracefully', async () => {
    const mockUser = { id: 'user1', email: 'test@example.com' }
    ;(requireAuth as jest.Mock).mockResolvedValueOnce(mockUser)
    ;(prisma.project.findMany as jest.Mock).mockRejectedValueOnce(new Error('Database error'))

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBeDefined()
  })

  it('should format answer titles correctly', async () => {
    const mockUser = { id: 'user1', email: 'test@example.com' }
    ;(requireAuth as jest.Mock).mockResolvedValueOnce(mockUser)

    const mockAnswers = [
      {
        id: 'a1',
        type: 'ANSWER',
        content: 'This is my answer',
        createdAt: new Date('2024-01-01'),
        author: { id: 'user1', name: 'John' },
        parent: {
          id: 'q1',
          content: 'This is a very long question that should be truncated after 60 characters for the title',
          author: { id: 'user2', name: 'Jane' }
        }
      }
    ]

    ;(prisma.project.findMany as jest.Mock).mockResolvedValueOnce([])
    ;(prisma.application.findMany as jest.Mock).mockResolvedValueOnce([])
    ;(prisma.post.findMany as jest.Mock)
      .mockResolvedValueOnce([]) // Product updates
      .mockResolvedValueOnce(mockAnswers) // Questions/answers
    ;(prisma.product.findMany as jest.Mock).mockResolvedValueOnce([])

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    const answerItem = data.items.find((item: any) => item.type === 'answer_posted')
    expect(answerItem.title).toBe('John answered a question')
  })
})