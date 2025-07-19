import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { postUpdateSchema } from '@/lib/validations'
import { requireAuth } from '@/lib/auth-utils'
import { handleApiError, parseRequestBody, successResponse } from '@/lib/api-utils'
import { AuthorizationError } from '@/lib/errors'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const post = await prisma.post.findUnique({
      where: { 
        id
      },
      include: {
        author: {
          select: { id: true, name: true, image: true }
        },
        project: {
          select: { id: true, title: true }
        },
        product: {
          select: { id: true, name: true }
        },
        bestAnswer: {
          include: {
            author: {
              select: { id: true, name: true, image: true }
            }
          }
        },
        replies: {
          include: {
            author: {
              select: { id: true, name: true, image: true }
            },
            _count: {
              select: { comments: true }
            }
          },
          orderBy: {
            createdAt: 'asc'
          }
        },
        comments: {
          where: {
            parentId: null // Only top-level comments for MVP
          },
          include: {
            author: {
              select: { id: true, name: true, image: true }
            }
          },
          orderBy: {
            createdAt: 'asc'
          }
        },
        _count: {
          select: { 
            replies: true,
            comments: true 
          }
        }
      }
    })

    if (!post) {
      throw new Error('Post not found')
    }

    return successResponse(post)
  } catch (error) {
    return handleApiError(error, 'GET /api/posts/[id]')
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params
    const { content } = await parseRequestBody(request, postUpdateSchema)

    // Check if post exists and user is the author
    const post = await prisma.post.findUnique({
      where: { id }
    })

    if (!post) {
      throw new Error('Post not found')
    }

    if (post.authorId !== user.id) {
      throw new AuthorizationError('Only post authors can edit their posts')
    }

    // Only allow updating content, not structural fields
    const updatedPost = await prisma.post.update({
      where: { id },
      data: { content },
      include: {
        author: {
          select: { id: true, name: true, image: true }
        }
      }
    })

    return successResponse(updatedPost)
  } catch (error) {
    return handleApiError(error, 'PATCH /api/posts/[id]')
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params

    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        _count: { select: { replies: true } }
      }
    })

    if (!post) {
      throw new Error('Post not found')
    }

    // Authorization: only author can delete their posts
    if (post.authorId !== user.id) {
      throw new AuthorizationError('Only post authors can delete their posts')
    }

    // Business rule: Questions can only be deleted if no answers exist
    if (post.type === 'QUESTION' && post._count.replies > 0) {
      throw new Error('Cannot delete question with existing answers')
    }

    // Prevent deletion of discussion posts
    if (post.type === 'PROJECT_DISCUSSION' || post.type === 'PRODUCT_DISCUSSION') {
      throw new Error('Discussion posts cannot be deleted')
    }

    await prisma.post.delete({
      where: { id }
    })

    return successResponse({ message: 'Post deleted successfully' })
  } catch (error) {
    return handleApiError(error, 'DELETE /api/posts/[id]')
  }
}