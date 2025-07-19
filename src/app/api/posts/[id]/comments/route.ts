import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { commentCreateSchema } from '@/lib/validations'
import { requireAuth } from '@/lib/auth-utils'
import { handleApiError, parseRequestBody, successResponse } from '@/lib/api-utils'

// Create comment on post
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params; // Move outside try block for scope
  try {
    const user = await requireAuth()
    const { content } = await parseRequestBody(request, commentCreateSchema)

    // Verify post exists
    const post = await prisma.post.findUnique({
      where: { id }
    })

    if (!post) {
      throw new Error('Post not found')
    }

    const comment = await prisma.comment.create({
      data: {
        content,
        authorId: user.id,
        postId: id,
      },
      include: {
        author: {
          select: { id: true, name: true, image: true }
        }
      }
    })

    return successResponse(comment, 201)
  } catch (error) {
    // Log the error with structured logging
    logger.dbError('comment creation', error as Error, { postId: id })
    return handleApiError(error, 'POST /api/posts/[id]/comments')
  }
}

// Get comments for post
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url)
    const take = parseInt(searchParams.get('take') || '50')
    const skip = parseInt(searchParams.get('skip') || '0')

    const comments = await prisma.comment.findMany({
      where: {
        postId: id,
        parentId: null, // Only top-level comments for MVP
      },
      take,
      skip,
      include: {
        author: {
          select: { id: true, name: true, image: true }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    })

    const total = await prisma.comment.count({
      where: {
        postId: id,
        parentId: null,
      }
    })

    return successResponse({
      comments,
      pagination: {
        total,
        take,
        skip
      }
    })
  } catch (error) {
    return handleApiError(error, 'GET /api/posts/[id]/comments')
  }
}