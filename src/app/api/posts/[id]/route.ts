import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const postUpdateSchema = z.object({
  content: z.string().min(1),
})

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const post = await prisma.post.findUnique({
      where: { 
        id: params.id,
        status: 'VISIBLE' // Only show visible posts
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
          where: {
            status: 'VISIBLE' // Only show visible replies
          },
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
            parentId: null, // Only top-level comments for MVP
            status: 'VISIBLE' // Only show visible comments
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
      return NextResponse.json({ message: 'Post not found' }, { status: 404 })
    }

    return NextResponse.json(post)
  } catch (error) {
    console.error("Error fetching post:", error)
    return NextResponse.json({ message: 'Error fetching post' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const body = await request.json()
    const validation = postUpdateSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(validation.error.errors, { status: 400 })
    }

    const { content } = validation.data

    // Check if post exists and user is the author
    const post = await prisma.post.findUnique({
      where: { id: params.id }
    })

    if (!post) {
      return NextResponse.json({ message: 'Post not found' }, { status: 404 })
    }

    if (post.authorId !== userId) {
      return NextResponse.json({ message: 'Insufficient permissions' }, { status: 403 })
    }

    // Only allow updating content, not structural fields
    const updatedPost = await prisma.post.update({
      where: { id: params.id },
      data: { content },
      include: {
        author: {
          select: { id: true, name: true, image: true }
        }
      }
    })

    return NextResponse.json(updatedPost)
  } catch (error) {
    console.error("Error updating post:", error)
    return NextResponse.json({ message: 'Error updating post' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    const post = await prisma.post.findUnique({
      where: { id: params.id },
      include: {
        _count: { select: { replies: true } }
      }
    })

    if (!post) {
      return NextResponse.json({ message: 'Post not found' }, { status: 404 })
    }

    // Authorization: only author can delete their posts
    if (post.authorId !== userId) {
      return NextResponse.json({ message: 'Insufficient permissions' }, { status: 403 })
    }

    // Business rule: Questions can only be deleted if no answers exist
    if (post.type === 'QUESTION' && post._count.replies > 0) {
      return NextResponse.json({ 
        message: 'Cannot delete question with existing answers' 
      }, { status: 400 })
    }

    // Prevent deletion of discussion posts
    if (post.type === 'PROJECT_DISCUSSION' || post.type === 'PRODUCT_DISCUSSION') {
      return NextResponse.json({ 
        message: 'Discussion posts cannot be deleted' 
      }, { status: 400 })
    }

    await prisma.post.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ message: 'Post deleted successfully' })
  } catch (error) {
    console.error("Error deleting post:", error)
    return NextResponse.json({ message: 'Error deleting post' }, { status: 500 })
  }
}