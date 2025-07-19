import { NextRequest } from 'next/server'
import { POST } from '../route'
import { getServerSession } from 'next-auth/next'
import { prisma } from '@/lib/prisma'

// Mock the dependencies
jest.mock('next-auth/next')
jest.mock('@/lib/prisma', () => ({
  prisma: {
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
    id: 'user-123',
    email: 'john@example.com',
    name: 'John Doe',
  }

  const mockSession = {
    user: mockUser,
  }

  const mockQuestion = {
    id: 'question-123',
    type: 'QUESTION',
    content: 'How do I implement AI?',
    authorId: 'user-123', // Same as session user
    bestAnswerId: null,
  }

  const mockAnswer = {
    id: 'answer-123',
    type: 'ANSWER',
    content: 'You can use OpenAI API...',
    authorId: 'user-456',
    parentId: 'question-123',
  }

  describe('POST /api/questions/[id]/resolve', () => {
    it('should mark an answer as best answer by question author', async () => {
      const updatedQuestion = {
        ...mockQuestion,
        bestAnswerId: 'answer-123',
        bestAnswer: mockAnswer
      }

      mockGetServerSession.mockResolvedValue(mockSession)
      mockPrisma.post.findUnique
        .mockResolvedValueOnce(mockQuestion) // First call for question
        .mockResolvedValueOnce(mockAnswer)   // Second call for answer
      mockPrisma.post.update.mockResolvedValue(updatedQuestion)

      const request = new NextRequest('http://localhost:3000/api/questions/question-123/resolve', {
        method: 'POST',
        body: JSON.stringify({
          bestAnswerId: 'answer-123'
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request, { params: Promise.resolve({ id: 'question-123' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.bestAnswerId).toBe('answer-123')
      expect(data.message).toBe('Best answer marked successfully')

      expect(mockPrisma.post.update).toHaveBeenCalledWith({
        where: { id: 'question-123' },
        data: { bestAnswerId: 'answer-123' },
        include: {
          bestAnswer: {
            include: {
              author: {
                select: { id: true, name: true, email: true, image: true }
              }
            }
          }
        }
      })
    })

    it('should reject if user is not the question author', async () => {
      const otherUserQuestion = {
        ...mockQuestion,
        authorId: 'other-user' // Different from session user
      }

      mockGetServerSession.mockResolvedValue(mockSession)
      mockPrisma.post.findUnique.mockResolvedValue(otherUserQuestion)

      const request = new NextRequest('http://localhost:3000/api/questions/question-123/resolve', {
        method: 'POST',
        body: JSON.stringify({
          bestAnswerId: 'answer-123'
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request, { params: Promise.resolve({ id: 'question-123' }) })

      expect(response.status).toBe(403)
      expect(mockPrisma.post.update).not.toHaveBeenCalled()
    })

    it('should reject if question does not exist', async () => {
      mockGetServerSession.mockResolvedValue(mockSession)
      mockPrisma.post.findUnique.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/questions/non-existent/resolve', {
        method: 'POST',
        body: JSON.stringify({
          bestAnswerId: 'answer-123'
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
      mockPrisma.post.findUnique.mockResolvedValue(updatePost)

      const request = new NextRequest('http://localhost:3000/api/questions/update-123/resolve', {
        method: 'POST',
        body: JSON.stringify({
          bestAnswerId: 'answer-123'
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
      mockPrisma.post.findUnique
        .mockResolvedValueOnce(mockQuestion) // Question exists
        .mockResolvedValueOnce(null)         // Answer does not exist

      const request = new NextRequest('http://localhost:3000/api/questions/question-123/resolve', {
        method: 'POST',
        body: JSON.stringify({
          bestAnswerId: 'non-existent-answer'
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request, { params: Promise.resolve({ id: 'question-123' }) })

      expect(response.status).toBe(404)
      expect(mockPrisma.post.update).not.toHaveBeenCalled()
    })

    it('should reject if answer is not an answer to this question', async () => {
      const wrongAnswer = {
        ...mockAnswer,
        parentId: 'other-question-123' // Answer to different question
      }

      mockGetServerSession.mockResolvedValue(mockSession)
      mockPrisma.post.findUnique
        .mockResolvedValueOnce(mockQuestion) // Question exists
        .mockResolvedValueOnce(wrongAnswer)  // Answer to different question

      const request = new NextRequest('http://localhost:3000/api/questions/question-123/resolve', {
        method: 'POST',
        body: JSON.stringify({
          bestAnswerId: 'answer-123'
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request, { params: Promise.resolve({ id: 'question-123' }) })

      expect(response.status).toBe(400)
      expect(mockPrisma.post.update).not.toHaveBeenCalled()
    })

    it('should require authentication', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/questions/question-123/resolve', {
        method: 'POST',
        body: JSON.stringify({
          bestAnswerId: 'answer-123'
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request, { params: Promise.resolve({ id: 'question-123' }) })

      expect(response.status).toBe(401)
      expect(mockPrisma.post.update).not.toHaveBeenCalled()
    })

    it('should validate request body', async () => {
      mockGetServerSession.mockResolvedValue(mockSession)

      const request = new NextRequest('http://localhost:3000/api/questions/question-123/resolve', {
        method: 'POST',
        body: JSON.stringify({
          // Missing bestAnswerId
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request, { params: Promise.resolve({ id: 'question-123' }) })

      expect(response.status).toBe(400)
      expect(mockPrisma.post.update).not.toHaveBeenCalled()
    })

    it('should allow updating best answer to a different answer', async () => {
      const questionWithBestAnswer = {
        ...mockQuestion,
        bestAnswerId: 'old-answer-123'
      }

      const newAnswer = {
        id: 'new-answer-123',
        type: 'ANSWER',
        parentId: 'question-123'
      }

      const updatedQuestion = {
        ...questionWithBestAnswer,
        bestAnswerId: 'new-answer-123'
      }

      mockGetServerSession.mockResolvedValue(mockSession)
      mockPrisma.post.findUnique
        .mockResolvedValueOnce(questionWithBestAnswer) // Question with existing best answer
        .mockResolvedValueOnce(newAnswer)              // New answer
      mockPrisma.post.update.mockResolvedValue(updatedQuestion)

      const request = new NextRequest('http://localhost:3000/api/questions/question-123/resolve', {
        method: 'POST',
        body: JSON.stringify({
          bestAnswerId: 'new-answer-123'
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request, { params: Promise.resolve({ id: 'question-123' }) })

      expect(response.status).toBe(200)
      expect(mockPrisma.post.update).toHaveBeenCalledWith({
        where: { id: 'question-123' },
        data: { bestAnswerId: 'new-answer-123' },
        include: expect.any(Object)
      })
    })
  })
})