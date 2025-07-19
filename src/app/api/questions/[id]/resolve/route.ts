import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const resolveQuestionSchema = z.object({
  bestAnswerId: z.string().cuid(),
})

// Mark question as resolved with a best answer
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validation = resolveQuestionSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(validation.error.errors, { status: 400 })
    }

    const { bestAnswerId } = validation.data
    const questionId = params.id
    const userId = session.user.id

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
      return NextResponse.json({ message: 'Question not found' }, { status: 404 })
    }

    if (question.type !== 'QUESTION') {
      return NextResponse.json({ message: 'Post is not a question' }, { status: 400 })
    }

    if (question.authorId !== userId) {
      return NextResponse.json({ message: 'Only question author can mark best answer' }, { status: 403 })
    }

    // Verify the best answer is actually an answer to this question
    if (question.replies.length === 0) {
      return NextResponse.json({ message: 'Answer not found or not an answer to this question' }, { status: 400 })
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

    return NextResponse.json(updatedQuestion)
  } catch (error) {
    console.error("Error resolving question:", error)
    return NextResponse.json({ message: 'Error resolving question' }, { status: 500 })
  }
}

// Unmark question as resolved (remove best answer)
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const questionId = params.id
    const userId = session.user.id

    // Verify question exists and user is the author
    const question = await prisma.post.findUnique({
      where: { id: questionId }
    })

    if (!question) {
      return NextResponse.json({ message: 'Question not found' }, { status: 404 })
    }

    if (question.type !== 'QUESTION') {
      return NextResponse.json({ message: 'Post is not a question' }, { status: 400 })
    }

    if (question.authorId !== userId) {
      return NextResponse.json({ message: 'Only question author can unmark best answer' }, { status: 403 })
    }

    // Remove best answer marking
    const updatedQuestion = await prisma.post.update({
      where: { id: questionId },
      data: {
        isResolved: false,
        bestAnswerId: null,
      }
    })

    return NextResponse.json(updatedQuestion)
  } catch (error) {
    console.error("Error unresolving question:", error)
    return NextResponse.json({ message: 'Error unresolving question' }, { status: 500 })
  }
}