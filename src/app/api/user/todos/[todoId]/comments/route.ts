import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { requireAuth } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

// POST /api/user/todos/[todoId]/comments
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ todoId: string }> }
) {
  try {
    const user = await requireAuth()
    const userId = user.id
    const { todoId } = await params
    const body = await request.json()

    if (!body.content || !body.content.trim()) {
      return NextResponse.json(
        { error: 'Comment content is required' },
        { status: 400 }
      )
    }

    // First check if the todo exists and belongs to the user
    const existingTodo = await prisma.todo.findFirst({
      where: {
        id: todoId,
        OR: [
          { creatorId: userId },
          { assigneeId: userId }
        ]
      }
    })

    if (!existingTodo) {
      return NextResponse.json(
        { error: 'Todo not found' },
        { status: 404 }
      )
    }

    // Create the comment
    const comment = await prisma.comment.create({
      data: {
        content: body.content,
        authorId: userId,
        todoId: todoId
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json(comment)
  } catch (error) {
    console.error('Error creating comment:', error)
    return NextResponse.json(
      { error: 'Failed to create comment' },
      { status: 500 }
    )
  }
}