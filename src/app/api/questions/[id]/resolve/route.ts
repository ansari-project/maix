import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveQuestionSchema } from '@/lib/validations'
import { requireAuth } from '@/lib/auth-utils'
import { handleApiError, parseRequestBody, successResponse } from '@/lib/api-utils'
import { AuthorizationError } from '@/lib/errors'

// Mark question as resolved with a best answer
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id: questionId } = await params
    const { bestAnswerId } = await parseRequestBody(request, resolveQuestionSchema)

    // Verify question exists and user is the author
    const question = await prisma.post.findUnique({
      where: { id: questionId },
      include: {
        replies: {
          where: { id: bestAnswerId }
        }
      }
    })

    if (!question) {
      throw new Error('Question not found')
    }

    if (question.type !== 'QUESTION') {
      throw new Error('Post is not a question')
    }

    if (question.authorId !== user.id) {
      throw new AuthorizationError('Only question author can mark best answer')
    }

    // Verify the best answer is actually an answer to this question
    if (question.replies.length === 0) {
      throw new Error('Answer not found or not an answer to this question')
    }

    // Update question with best answer
    const updatedQuestion = await prisma.post.update({
      where: { id: questionId },
      data: {
        isResolved: true,
        bestAnswerId: bestAnswerId,
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

    return successResponse(updatedQuestion)
  } catch (error) {
    return handleApiError(error, 'POST /api/questions/[id]/resolve')
  }
}

// Unmark question as resolved (remove best answer)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id: questionId } = await params

    // Verify question exists and user is the author
    const question = await prisma.post.findUnique({
      where: { id: questionId }
    })

    if (!question) {
      throw new Error('Question not found')
    }

    if (question.type !== 'QUESTION') {
      throw new Error('Post is not a question')
    }

    if (question.authorId !== user.id) {
      throw new AuthorizationError('Only question author can unmark best answer')
    }

    // Remove best answer marking
    const updatedQuestion = await prisma.post.update({
      where: { id: questionId },
      data: {
        isResolved: false,
        bestAnswerId: null,
      }
    })

    return successResponse(updatedQuestion)
  } catch (error) {
    return handleApiError(error, 'DELETE /api/questions/[id]/resolve')
  }
}