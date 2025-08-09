import { GET } from '../route'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-utils'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    project: {
      findMany: jest.fn()
    },
    post: {
      findMany: jest.fn()
    },
    product: {
      findMany: jest.fn()
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

describe('GET /api/feed - updatedAt sorting', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should sort projects by updatedAt descending', async () => {
    const mockUser = { id: 'user1', email: 'test@example.com' }
    ;(requireAuth as jest.Mock).mockResolvedValueOnce(mockUser)

    const mockProjects = [
      {
        id: 'proj1',
        name: 'Recently Updated Project',
        status: 'COMPLETED',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-10'), // More recent
        owner: { id: 'user1', name: 'John Doe' }
      },
      {
        id: 'proj2',
        name: 'Older Project',
        status: 'IN_PROGRESS',
        createdAt: new Date('2024-01-05'),
        updatedAt: new Date('2024-01-05'), // Less recent
        owner: { id: 'user2', name: 'Jane Doe' }
      }
    ]

    ;(prisma.project.findMany as jest.Mock).mockResolvedValueOnce(mockProjects)
    ;(prisma.post.findMany as jest.Mock).mockResolvedValue([])
    ;(prisma.product.findMany as jest.Mock).mockResolvedValueOnce([])

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    
    // Verify findMany was called with updatedAt sorting
    expect((prisma.project.findMany as jest.Mock)).toHaveBeenCalledWith({
      take: 10,
      orderBy: { updatedAt: 'desc' },
      include: { owner: { select: { id: true, name: true } } }
    })

    // Verify items use updatedAt as timestamp
    expect(data.items[0].timestamp).toBe(mockProjects[0].updatedAt.toISOString())
    expect(data.items[1].timestamp).toBe(mockProjects[1].updatedAt.toISOString())
  })

  it('should use "Completed:" prefix for completed projects', async () => {
    const mockUser = { id: 'user1', email: 'test@example.com' }
    ;(requireAuth as jest.Mock).mockResolvedValueOnce(mockUser)

    const mockProjects = [
      {
        id: 'proj1',
        name: 'Finished Project',
        status: 'COMPLETED',
        updatedAt: new Date('2024-01-10'),
        owner: { id: 'user1', name: 'John Doe' }
      },
      {
        id: 'proj2',
        name: 'Active Project',
        status: 'IN_PROGRESS',
        updatedAt: new Date('2024-01-05'),
        owner: { id: 'user2', name: 'Jane Doe' }
      }
    ]

    ;(prisma.project.findMany as jest.Mock).mockResolvedValueOnce(mockProjects)
    ;(prisma.post.findMany as jest.Mock).mockResolvedValue([])
    ;(prisma.product.findMany as jest.Mock).mockResolvedValueOnce([])

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.items[0].title).toBe('Completed: Finished Project')
    expect(data.items[1].title).toBe('New project: Active Project')
  })
})