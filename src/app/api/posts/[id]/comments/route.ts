import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const commentCreateSchema = z.object({
  content: z.string().min(1),
})

// Create comment on post
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
    const validation = commentCreateSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(validation.error.errors, { status: 400 })
    }

    const { content } = validation.data
    const userId = session.user.id

    // Verify post exists
    const post = await prisma.post.findUnique({
      where: { id: params.id }
    })

    if (!post) {
      return NextResponse.json({ message: 'Post not found' }, { status: 404 })
    }

    const comment = await prisma.comment.create({
      data: {
        content,
        authorId: userId,
        postId: params.id,
      },
      include: {
        author: {
          select: { id: true, name: true, image: true }
        }
      }
    })

    return NextResponse.json(comment, { status: 201 })
  } catch (error) {
    console.error("Error creating comment:", error)
    return NextResponse.json({ message: 'Error creating comment' }, { status: 500 })
  }
}

// Get comments for post
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const take = parseInt(searchParams.get('take') || '50')
    const skip = parseInt(searchParams.get('skip') || '0')

    const comments = await prisma.comment.findMany({
      where: {
        postId: params.id,
        parentId: null, // Only top-level comments for MVP
        status: 'VISIBLE' // Only show visible comments
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
        postId: params.id,
        parentId: null,
        status: 'VISIBLE'
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