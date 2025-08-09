import { GET } from '../route'
import { prisma } from '@/lib/prisma'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    project: {
      findMany: jest.fn()
    },
    product: {
      findMany: jest.fn()
    },
    post: {
      findMany: jest.fn()
    }
  }
}))

jest.mock('@/lib/api-utils', () => ({
  handleApiError: jest.fn((error: any) => {
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 })
  }),
  successResponse: jest.fn((data: any) => {
    return new Response(JSON.stringify(data), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  })
}))

jest.mock('@/lib/public-data-filter', () => ({
  filterPublicUser: jest.fn((user: any) => ({ id: user.id, name: user.name }))
}))

describe('GET /api/public/feed - updatedAt sorting', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should include completed projects in public feed', async () => {
    const mockProjects = [
      {
        id: 'proj1',
        name: 'Completed Public Project',
        description: 'A completed project',
        status: 'COMPLETED',
        isActive: false,
        visibility: 'PUBLIC',
        helpType: 'MVP',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-10'),
        owner: { id: 'user1', name: 'John Doe' }
      },
      {
        id: 'proj2',
        name: 'Active Public Project',
        description: 'An active project',
        status: 'IN_PROGRESS',
        isActive: true,
        visibility: 'PUBLIC',
        helpType: 'MVP',
        createdAt: new Date('2024-01-05'),
        updatedAt: new Date('2024-01-05'),
        owner: { id: 'user2', name: 'Jane Doe' }
      }
    ]

    ;(prisma.project.findMany as jest.Mock).mockResolvedValueOnce(mockProjects)
    ;(prisma.product.findMany as jest.Mock).mockResolvedValueOnce([])
    ;(prisma.post.findMany as jest.Mock).mockResolvedValue([])

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    
    // Verify findMany was called without isActive filter
    expect((prisma.project.findMany as jest.Mock)).toHaveBeenCalledWith({
      where: { visibility: 'PUBLIC' },
      take: 10,
      orderBy: { updatedAt: 'desc' },
      include: { owner: { select: { id: true, name: true } } }
    })

    // Verify both active and completed projects are included
    expect(data.items).toHaveLength(2)
    expect(data.items[0].data.status).toBe('COMPLETED')
    expect(data.items[1].data.status).toBe('IN_PROGRESS')
  })

  it('should sort projects by updatedAt and use correct titles', async () => {
    const mockProjects = [
      {
        id: 'proj1',
        name: 'Recently Completed',
        status: 'COMPLETED',
        visibility: 'PUBLIC',
        updatedAt: new Date('2024-01-10'),
        owner: { id: 'user1', name: 'John Doe' }
      },
      {
        id: 'proj2',
        name: 'Older Active',
        status: 'AWAITING_VOLUNTEERS',
        visibility: 'PUBLIC',
        updatedAt: new Date('2024-01-05'),
        owner: { id: 'user2', name: 'Jane Doe' }
      }
    ]

    ;(prisma.project.findMany as jest.Mock).mockResolvedValueOnce(mockProjects)
    ;(prisma.product.findMany as jest.Mock).mockResolvedValueOnce([])
    ;(prisma.post.findMany as jest.Mock).mockResolvedValue([])

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    
    // Verify correct titles
    expect(data.items[0].title).toBe('Completed: Recently Completed')
    expect(data.items[1].title).toBe('New project: Older Active')
    
    // Verify timestamps use updatedAt
    expect(data.items[0].timestamp).toBe(mockProjects[0].updatedAt.toISOString())
    expect(data.items[1].timestamp).toBe(mockProjects[1].updatedAt.toISOString())
  })
})