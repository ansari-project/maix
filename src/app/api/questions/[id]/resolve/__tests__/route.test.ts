import { NextRequest } from 'next/server'
import { POST } from '../route'
import { getServerSession } from 'next-auth/next'
import { prisma } from '@/lib/prisma'

// Mock the dependencies
jest.mock('next-auth/next')
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
    post: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}))

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>
const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('/api/questions/[id]/resolve', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const mockUser = {
    id: 'ckl1234567890abcdefghijk1',
    email: 'john@example.com',
    name: 'John Doe',
  }

  const mockSession = {
    user: {
      email: mockUser.email,
      name: mockUser.name,
    },
  }

  const mockQuestion = {
    id: 'ckl1234567890abcdefghijk2',
    type: 'QUESTION',
    content: 'How do I implement AI?',
    authorId: 'ckl1234567890abcdefghijk1', // Same as session user
    bestAnswerId: null,
  }

  const mockAnswer = {
    id: 'ckl1234567890abcdefghijk3',
    type: 'ANSWER',
    content: 'You can use OpenAI API...',
    authorId: 'ckl1234567890abcdefghijk4',
    parentId: 'ckl1234567890abcdefghijk2',
  }

  describe('POST /api/questions/[id]/resolve', () => {
    it('should mark an answer as best answer by question author', async () => {
      const updatedQuestion = {
        ...mockQuestion,
        isResolved: true,
        bestAnswerId: 'ckl1234567890abcdefghijk3',
        bestAnswer: mockAnswer
      }

      mockGetServerSession.mockResolvedValue(mockSession)
      mockPrisma.user.findUnique.mockResolvedValue(mockUser)
      mockPrisma.post.findUnique.mockResolvedValueOnce({
        ...mockQuestion,
        replies: [mockAnswer]
      })
      mockPrisma.post.update.mockResolvedValue(updatedQuestion)

      const request = new NextRequest('http://localhost:3000/api/questions/question-123/resolve', {
        method: 'POST',
        body: JSON.stringify({
          bestAnswerId: 'ckl1234567890abcdefghijk3'
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request, { params: Promise.resolve({ id: 'ckl1234567890abcdefghijk2' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.bestAnswerId).toBe('ckl1234567890abcdefghijk3')
      expect(data.isResolved).toBe(true)

      expect(mockPrisma.post.update).toHaveBeenCalledWith({
        where: { id: 'ckl1234567890abcdefghijk2' },
        data: { 
          isResolved: true,
          bestAnswerId: 'ckl1234567890abcdefghijk3' 
        },
        include: {
          bestAnswer: {
            include: {
              author: {
                select: { id: true, name: true, image: true }
              }
            }
          }
        }
      })
    })

    it('should reject if user is not the question author', async () => {
      const otherUserQuestion = {
        ...mockQuestion,
        authorId: 'ckl1234567890abcdefghijk5' // Different from session user
      }

      mockGetServerSession.mockResolvedValue(mockSession)
      mockPrisma.user.findUnique.mockResolvedValue(mockUser)
      mockPrisma.post.findUnique.mockResolvedValue({
        ...otherUserQuestion,
        replies: [mockAnswer]
      })

      const request = new NextRequest('http://localhost:3000/api/questions/question-123/resolve', {
        method: 'POST',
        body: JSON.stringify({
          bestAnswerId: 'ckl1234567890abcdefghijk3'
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request, { params: Promise.resolve({ id: 'ckl1234567890abcdefghijk2' }) })

      expect(response.status).toBe(403)
      expect(mockPrisma.post.update).not.toHaveBeenCalled()
    })

    it('should reject if question does not exist', async () => {
      mockGetServerSession.mockResolvedValue(mockSession)
      mockPrisma.user.findUnique.mockResolvedValue(mockUser)
      mockPrisma.post.findUnique.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/questions/non-existent/resolve', {
        method: 'POST',
        body: JSON.stringify({
          bestAnswerId: 'ckl1234567890abcdefghijk3'
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request, { params: Promise.resolve({ id: 'non-existent' }) })

      expect(response.status).toBe(404)
      expect(mockPrisma.post.update).not.toHaveBeenCalled()
    })

    it('should reject if post is not a question', async () => {
      const updatePost = {
        ...mockQuestion,
        type: 'PROJECT_UPDATE'
      }

      mockGetServerSession.mockResolvedValue(mockSession)
      mockPrisma.user.findUnique.mockResolvedValue(mockUser)
      mockPrisma.post.findUnique.mockResolvedValue({
        ...updatePost,
        replies: [mockAnswer]
      })

      const request = new NextRequest('http://localhost:3000/api/questions/update-123/resolve', {
        method: 'POST',
        body: JSON.stringify({
          bestAnswerId: 'ckl1234567890abcdefghijk3'
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request, { params: Promise.resolve({ id: 'update-123' }) })

      expect(response.status).toBe(400)
      expect(mockPrisma.post.update).not.toHaveBeenCalled()
    })

    it('should reject if answer does not exist', async () => {
      mockGetServerSession.mockResolvedValue(mockSession)
      mockPrisma.user.findUnique.mockResolvedValue(mockUser)
      mockPrisma.post.findUnique.mockResolvedValue({
        ...mockQuestion,
        replies: [] // No answers found
      })

      const request = new NextRequest('http://localhost:3000/api/questions/question-123/resolve', {
        method: 'POST',
        body: JSON.stringify({
          bestAnswerId: 'non-existent-answer'
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request, { params: Promise.resolve({ id: 'ckl1234567890abcdefghijk2' }) })

      expect(response.status).toBe(400)
      expect(mockPrisma.post.update).not.toHaveBeenCalled()
    })

    it('should reject if answer is not an answer to this question', async () => {
      const wrongAnswer = {
        ...mockAnswer,
        parentId: 'ckl1234567890abcdefghijk6' // Answer to different question
      }

      mockGetServerSession.mockResolvedValue(mockSession)
      mockPrisma.user.findUnique.mockResolvedValue(mockUser)
      mockPrisma.post.findUnique.mockResolvedValue({
        ...mockQuestion,
        replies: [] // Answer with wrong parentId not found in replies
      })

      const request = new NextRequest('http://localhost:3000/api/questions/question-123/resolve', {
        method: 'POST',
        body: JSON.stringify({
          bestAnswerId: 'ckl1234567890abcdefghijk3'
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request, { params: Promise.resolve({ id: 'ckl1234567890abcdefghijk2' }) })

      expect(response.status).toBe(400)
      expect(mockPrisma.post.update).not.toHaveBeenCalled()
    })

    it('should require authentication', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/questions/question-123/resolve', {
        method: 'POST',
        body: JSON.stringify({
          bestAnswerId: 'ckl1234567890abcdefghijk3'
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request, { params: Promise.resolve({ id: 'ckl1234567890abcdefghijk2' }) })

      expect(response.status).toBe(401)
      expect(mockPrisma.post.update).not.toHaveBeenCalled()
    })

    it('should validate request body', async () => {
      mockGetServerSession.mockResolvedValue(mockSession)
      mockPrisma.user.findUnique.mockResolvedValue(mockUser)

      const request = new NextRequest('http://localhost:3000/api/questions/question-123/resolve', {
        method: 'POST',
        body: JSON.stringify({
          // Missing bestAnswerId
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request, { params: Promise.resolve({ id: 'ckl1234567890abcdefghijk2' }) })

      expect(response.status).toBe(400)
      expect(mockPrisma.post.update).not.toHaveBeenCalled()
    })

    it('should allow updating best answer to a different answer', async () => {
      const questionWithBestAnswer = {
        ...mockQuestion,
        bestAnswerId: 'ckl1234567890abcdefghijk7'
      }

      const newAnswer = {
        id: 'ckl1234567890abcdefghijk8',
        type: 'ANSWER',
        parentId: 'ckl1234567890abcdefghijk2'
      }

      const updatedQuestion = {
        ...questionWithBestAnswer,
        bestAnswerId: 'ckl1234567890abcdefghijk8'
      }

      mockGetServerSession.mockResolvedValue(mockSession)
      mockPrisma.user.findUnique.mockResolvedValue(mockUser)
      mockPrisma.post.findUnique.mockResolvedValue({
        ...questionWithBestAnswer,
        replies: [newAnswer]
      })
      mockPrisma.post.update.mockResolvedValue(updatedQuestion)

      const request = new NextRequest('http://localhost:3000/api/questions/question-123/resolve', {
        method: 'POST',
        body: JSON.stringify({
          bestAnswerId: 'ckl1234567890abcdefghijk8'
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request, { params: Promise.resolve({ id: 'ckl1234567890abcdefghijk2' }) })

      expect(response.status).toBe(200)
      expect(mockPrisma.post.update).toHaveBeenCalledWith({
        where: { id: 'ckl1234567890abcdefghijk2' },
        data: { 
          isResolved: true,
          bestAnswerId: 'ckl1234567890abcdefghijk8' 
        },
        include: expect.any(Object)
      })
    })
  })
})