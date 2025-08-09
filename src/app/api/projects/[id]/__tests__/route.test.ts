import { GET } from '../route'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth/next'
import { hasResourceAccess } from '@/lib/ownership-utils'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    project: {
      findUnique: jest.fn()
    },
    projectMember: {
      findUnique: jest.fn()
    },
    productMember: {
      findUnique: jest.fn()
    },
    organizationMember: {
      findUnique: jest.fn()
    }
  }
}))

jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn()
}))

jest.mock('@/lib/ownership-utils', () => ({
  hasResourceAccess: jest.fn()
}))

describe('GET /api/projects/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return completed projects without isActive filter', async () => {
    const mockProject = {
      id: 'proj1',
      name: 'Completed Project',
      status: 'COMPLETED',
      isActive: false,
      visibility: 'PUBLIC',
      owner: { id: 'user1', name: 'John', email: 'john@example.com' },
      organization: null,
      applications: []
    }

    ;(prisma.project.findUnique as jest.Mock).mockResolvedValueOnce(mockProject)
    ;(getServerSession as jest.Mock).mockResolvedValueOnce(null)
    // Public project, no session - should be accessible

    const params = Promise.resolve({ id: 'proj1' })
    const response = await GET(new Request('http://localhost'), { params })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.name).toBe('Completed Project')
    expect(data.status).toBe('COMPLETED')
    expect(data.isActive).toBe(false)

    // Verify the query didn't filter by isActive
    expect((prisma.project.findUnique as jest.Mock)).toHaveBeenCalledWith({
      where: { id: 'proj1' },
      include: expect.any(Object)
    })
  })

  it('should return 404 for non-existent projects', async () => {
    ;(prisma.project.findUnique as jest.Mock).mockResolvedValueOnce(null)
    ;(getServerSession as jest.Mock).mockResolvedValueOnce(null)

    const params = Promise.resolve({ id: 'non-existent' })
    const response = await GET(new Request('http://localhost'), { params })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Project not found')
  })

  it('should check access permissions for private projects', async () => {
    const mockProject = {
      id: 'proj1',
      name: 'Private Project',
      visibility: 'PRIVATE',
      ownerId: 'user2',
      owner: { id: 'user2', name: 'Jane', email: 'jane@example.com' },
      organization: null,
      applications: []
    }

    ;(prisma.project.findUnique as jest.Mock).mockResolvedValueOnce(mockProject)
    ;(getServerSession as jest.Mock).mockResolvedValueOnce({ user: { id: 'user1' } })
    ;(hasResourceAccess as jest.Mock).mockResolvedValueOnce(false)

    const params = Promise.resolve({ id: 'proj1' })
    const response = await GET(new Request('http://localhost'), { params })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Project not found')
  })
})