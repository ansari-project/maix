/**
 * @jest-environment node
import { describe, it, expect, beforeEach, beforeAll, afterAll } from '@jest/globals'
 */

/**
 * Questions Resolve Route Integration Tests
 * 
 * 🗄️ INTEGRATION TEST - Uses REAL TEST DATABASE on port 5433
 * 
 * Prerequisites:
 *   ✅ Docker test database running (npm run test:db:start)
 *   ✅ .env.test configured with test database URL
 * 
 * This test:
 *   - Creates real questions, answers, and users in test database
 *   - Tests actual database constraints and relationships
 *   - Validates best answer marking with real data
 *   - Verifies authorization with real user ownership
 * 
 * Run with: npm run test:integration
 * Run safely with: npm run test:integration:safe (auto-starts DB)
 */

// Mock the prisma module to use test database
jest.mock('@/lib/prisma', () => ({
  prisma: require('@/lib/test/db-test-utils').prismaTest
}))

// Mock only external dependencies
jest.mock('@/lib/auth-utils')

import { NextRequest } from 'next/server'
import { POST, DELETE } from '../route'
import { requireAuth } from '@/lib/auth-utils'
import {
  setupTestDatabase,
  cleanupTestDatabase,
  createTestUser,
  prismaTest,
  disconnectDatabase
} from '@/lib/test/db-test-utils'

const mockRequireAuth = requireAuth as jest.MockedFunction<typeof requireAuth>

describe('/api/questions/[id]/resolve Integration Tests', () => {
  let questionAuthor: any
  let answerAuthor: any
  let otherUser: any
  let testQuestion: any
  let testAnswer: any
  let testAnswer2: any

  beforeAll(async () => {
    await setupTestDatabase()
  }, 30000)

  afterAll(async () => {
    await disconnectDatabase()
  })

  beforeEach(async () => {
    await cleanupTestDatabase()
    
    // Create test users
    questionAuthor = await createTestUser({
      name: 'Question Author',
      email: 'question.author@example.com'
    })
    
    answerAuthor = await createTestUser({
      name: 'Answer Author',
      email: 'answer.author@example.com'
    })
    
    otherUser = await createTestUser({
      name: 'Other User',
      email: 'other@example.com'
    })
    
    // Create a question
    testQuestion = await prismaTest.post.create({
      data: {
        type: 'QUESTION',
        content: 'How do I implement AI in my project?',
        authorId: questionAuthor.id,
        isResolved: false
      }
    })
    
    // Create answers to the question
    testAnswer = await prismaTest.post.create({
      data: {
        type: 'ANSWER',
        content: 'You can use OpenAI API for implementing AI features.',
        authorId: answerAuthor.id,
        parentId: testQuestion.id
      }
    })
    
    testAnswer2 = await prismaTest.post.create({
      data: {
        type: 'ANSWER',
        content: 'Consider using Google Gemini for better performance.',
        authorId: otherUser.id,
        parentId: testQuestion.id
      }
    })
  })

  const createMockRequest = (body: any) => {
    return new NextRequest('http://localhost/api/questions/question-id/resolve', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
  }

  describe('POST /api/questions/[id]/resolve', () => {
    it('should mark an answer as best answer by question author', async () => {
      // Mock auth as question author
      mockRequireAuth.mockResolvedValue(questionAuthor as any)

      const request = createMockRequest({ 
        bestAnswerId: testAnswer.id 
      })
      const response = await POST(request, { 
        params: Promise.resolve({ id: testQuestion.id }) 
      })
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.bestAnswerId).toBe(testAnswer.id)
      expect(responseData.isResolved).toBe(true)

      // Verify in database
      const updatedQuestion = await prismaTest.post.findUnique({
        where: { id: testQuestion.id }
      })
      expect(updatedQuestion?.isResolved).toBe(true)
      expect(updatedQuestion?.bestAnswerId).toBe(testAnswer.id)
    })

    it('should reject if user is not the question author', async () => {
      // Mock auth as different user
      mockRequireAuth.mockResolvedValue(answerAuthor as any)

      const request = createMockRequest({ 
        bestAnswerId: testAnswer.id 
      })
      const response = await POST(request, { 
        params: Promise.resolve({ id: testQuestion.id }) 
      })
      const responseData = await response.json()

      expect(response.status).toBe(403)
      expect(responseData.message).toBe('Only question author can mark best answer')

      // Verify question unchanged in database
      const question = await prismaTest.post.findUnique({
        where: { id: testQuestion.id }
      })
      expect(question?.isResolved).toBe(false)
      expect(question?.bestAnswerId).toBeNull()
    })

    it('should return error for non-existent question', async () => {
      mockRequireAuth.mockResolvedValue(questionAuthor as any)

      const request = createMockRequest({ 
        bestAnswerId: testAnswer.id 
      })
      const response = await POST(request, { 
        params: Promise.resolve({ id: 'non-existent-id' }) 
      })
      const responseData = await response.json()

      // The API returns 500 for not found errors
      expect(response.status).toBe(500)
      expect(responseData.message).toBe('Internal server error')
    })

    it('should reject if post is not a question', async () => {
      // Create a project update post (not a question)
      const regularPost = await prismaTest.post.create({
        data: {
          type: 'PROJECT_UPDATE',
          content: 'This is a project update, not a question',
          authorId: questionAuthor.id
        }
      })

      mockRequireAuth.mockResolvedValue(questionAuthor as any)

      const request = createMockRequest({ 
        bestAnswerId: testAnswer.id 
      })
      const response = await POST(request, { 
        params: Promise.resolve({ id: regularPost.id }) 
      })
      const responseData = await response.json()

      // The API returns 500 for this error
      expect(response.status).toBe(500)
      expect(responseData.message).toBe('Internal server error')
    })

    it('should reject if answer is not for this question', async () => {
      // Create another question
      const anotherQuestion = await prismaTest.post.create({
        data: {
          type: 'QUESTION',
          content: 'Different question',
          authorId: questionAuthor.id
        }
      })

      // Create answer for the other question
      const wrongAnswer = await prismaTest.post.create({
        data: {
          type: 'ANSWER',
          content: 'Answer to different question',
          authorId: answerAuthor.id,
          parentId: anotherQuestion.id
        }
      })

      mockRequireAuth.mockResolvedValue(questionAuthor as any)

      const request = createMockRequest({ 
        bestAnswerId: wrongAnswer.id 
      })
      const response = await POST(request, { 
        params: Promise.resolve({ id: testQuestion.id }) 
      })
      const responseData = await response.json()

      // The API returns 500 for this error
      expect(response.status).toBe(500)
      expect(responseData.message).toBe('Internal server error')
    })

    it('should update existing best answer', async () => {
      // First mark one answer as best
      mockRequireAuth.mockResolvedValue(questionAuthor as any)

      let request = createMockRequest({ 
        bestAnswerId: testAnswer.id 
      })
      let response = await POST(request, { 
        params: Promise.resolve({ id: testQuestion.id }) 
      })
      expect(response.status).toBe(200)

      // Then change to different answer
      request = createMockRequest({ 
        bestAnswerId: testAnswer2.id 
      })
      response = await POST(request, { 
        params: Promise.resolve({ id: testQuestion.id }) 
      })
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.bestAnswerId).toBe(testAnswer2.id)
      expect(responseData.isResolved).toBe(true)

      // Verify in database
      const updatedQuestion = await prismaTest.post.findUnique({
        where: { id: testQuestion.id }
      })
      expect(updatedQuestion?.bestAnswerId).toBe(testAnswer2.id)
    })

    it('should return error for unauthenticated user', async () => {
      mockRequireAuth.mockRejectedValue(new Error('Not authenticated'))

      const request = createMockRequest({ 
        bestAnswerId: testAnswer.id 
      })
      const response = await POST(request, { 
        params: Promise.resolve({ id: testQuestion.id }) 
      })
      const responseData = await response.json()

      // The API returns 500 for auth errors
      expect(response.status).toBe(500)
      expect(responseData.message).toBe('Internal server error')
    })

    it('should validate input format', async () => {
      mockRequireAuth.mockResolvedValue(questionAuthor as any)

      const request = createMockRequest({ 
        // Missing bestAnswerId
      })
      const response = await POST(request, { 
        params: Promise.resolve({ id: testQuestion.id }) 
      })
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.message).toBe('Invalid input')
    })
  })

  describe('DELETE /api/questions/[id]/resolve', () => {
    beforeEach(async () => {
      // Mark question as resolved before each DELETE test
      await prismaTest.post.update({
        where: { id: testQuestion.id },
        data: {
          isResolved: true,
          bestAnswerId: testAnswer.id
        }
      })
    })

    it('should remove best answer marking by question author', async () => {
      // Mock auth as question author
      mockRequireAuth.mockResolvedValue(questionAuthor as any)

      const request = new NextRequest('http://localhost/api/questions/question-id/resolve', {
        method: 'DELETE'
      })
      const response = await DELETE(request, { 
        params: Promise.resolve({ id: testQuestion.id }) 
      })
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.isResolved).toBe(false)
      expect(responseData.bestAnswerId).toBeNull()

      // Verify in database
      const updatedQuestion = await prismaTest.post.findUnique({
        where: { id: testQuestion.id }
      })
      expect(updatedQuestion?.isResolved).toBe(false)
      expect(updatedQuestion?.bestAnswerId).toBeNull()
    })

    it('should reject if user is not the question author', async () => {
      // Mock auth as different user
      mockRequireAuth.mockResolvedValue(answerAuthor as any)

      const request = new NextRequest('http://localhost/api/questions/question-id/resolve', {
        method: 'DELETE'
      })
      const response = await DELETE(request, { 
        params: Promise.resolve({ id: testQuestion.id }) 
      })
      const responseData = await response.json()

      expect(response.status).toBe(403)
      expect(responseData.message).toBe('Only question author can unmark best answer')

      // Verify question unchanged in database
      const question = await prismaTest.post.findUnique({
        where: { id: testQuestion.id }
      })
      expect(question?.isResolved).toBe(true)
      expect(question?.bestAnswerId).toBe(testAnswer.id)
    })

    it('should return error for non-existent question', async () => {
      mockRequireAuth.mockResolvedValue(questionAuthor as any)

      const request = new NextRequest('http://localhost/api/questions/question-id/resolve', {
        method: 'DELETE'
      })
      const response = await DELETE(request, { 
        params: Promise.resolve({ id: 'non-existent-id' }) 
      })
      const responseData = await response.json()

      // The API returns 500 for not found errors
      expect(response.status).toBe(500)
      expect(responseData.message).toBe('Internal server error')
    })

    it('should handle already unresolved questions gracefully', async () => {
      // First unmark the question
      await prismaTest.post.update({
        where: { id: testQuestion.id },
        data: {
          isResolved: false,
          bestAnswerId: null
        }
      })

      mockRequireAuth.mockResolvedValue(questionAuthor as any)

      const request = new NextRequest('http://localhost/api/questions/question-id/resolve', {
        method: 'DELETE'
      })
      const response = await DELETE(request, { 
        params: Promise.resolve({ id: testQuestion.id }) 
      })
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.isResolved).toBe(false)
      expect(responseData.bestAnswerId).toBeNull()
    })

    it('should return error for unauthenticated user', async () => {
      mockRequireAuth.mockRejectedValue(new Error('Not authenticated'))

      const request = new NextRequest('http://localhost/api/questions/question-id/resolve', {
        method: 'DELETE'
      })
      const response = await DELETE(request, { 
        params: Promise.resolve({ id: testQuestion.id }) 
      })
      const responseData = await response.json()

      // The API returns 500 for auth errors  
      expect(response.status).toBe(500)
      expect(responseData.message).toBe('Internal server error')
    })
  })
})