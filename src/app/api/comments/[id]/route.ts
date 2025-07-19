import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { commentUpdateSchema } from '@/lib/validations'
import { requireAuth } from '@/lib/auth-utils'
import { handleApiError, parseRequestBody, successResponse } from '@/lib/api-utils'
import { AuthorizationError } from '@/lib/errors'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params
    const { content } = await parseRequestBody(request, commentUpdateSchema)

    // Check if comment exists and user is the author
    const comment = await prisma.comment.findUnique({
      where: { id }
    })

    if (!comment) {
      throw new Error('Comment not found')
    }

    if (comment.authorId !== user.id) {
      throw new AuthorizationError('Only comment authors can edit their comments')
    }

    // Update comment
    const updatedComment = await prisma.comment.update({
      where: { id },
      data: { content },
      include: {
        author: {
          select: { id: true, name: true, image: true }
        }
      }
    })

    return successResponse(updatedComment)
  } catch (error) {
    return handleApiError(error, 'PATCH /api/comments/[id]')
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params

    const comment = await prisma.comment.findUnique({
      where: { id },
      include: {
        _count: { select: { replies: true } }
      }
    })

    if (!comment) {
      throw new Error('Comment not found')
    }

    // Authorization: only author can delete their comments
    if (comment.authorId !== user.id) {
      throw new AuthorizationError('Only comment authors can delete their comments')
    }

    // Cannot delete comment if it has replies
    if (comment._count.replies > 0) {
      throw new Error('Cannot delete comment with replies')
    }

    await prisma.comment.delete({
      where: { id }
    })

    return successResponse({ message: 'Comment deleted successfully' })
  } catch (error) {
    return handleApiError(error, 'DELETE /api/comments/[id]')
  }
}