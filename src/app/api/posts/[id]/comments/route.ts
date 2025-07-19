import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { z } from 'zod'

const commentCreateSchema = z.object({
  content: z.string().min(1),
})

// Create comment on post
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params; // Move outside try block for scope
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    // Get user ID from email
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 })
    }

    const body = await request.json()
    const validation = commentCreateSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(validation.error.errors, { status: 400 })
    }

    const { content } = validation.data
    const userId = user.id

    // Verify post exists
    const post = await prisma.post.findUnique({
      where: { id }
    })

    if (!post) {
      return NextResponse.json({ message: 'Post not found' }, { status: 404 })
    }

    const comment = await prisma.comment.create({
      data: {
        content,
        authorId: userId,
        postId: id,
      },
      include: {
        author: {
          select: { id: true, name: true, image: true }
        }
      }
    })

    return NextResponse.json(comment, { status: 201 })
  } catch (error) {
    // Log the error with structured logging
    logger.dbError('comment creation', error as Error, { postId: id })
    return NextResponse.json({ message: 'Error creating comment' }, { status: 500 })
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

    return NextResponse.json({
      comments,
      pagination: {
        total,
        take,
        skip
      }
    })
  } catch (error) {
    console.error("Error fetching comments:", error)
    return NextResponse.json({ message: 'Error fetching comments' }, { status: 500 })
  }
}