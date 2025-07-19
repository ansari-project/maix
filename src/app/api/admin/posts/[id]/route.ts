import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { z } from 'zod'

const postModerationSchema = z.object({
  status: z.enum(['VISIBLE', 'HIDDEN', 'PENDING_REVIEW']),
  reason: z.string().optional(),
})

// Check if user is admin (for now, just check if they exist - enhance with proper role system later)
async function checkAdminPermissions(userEmail: string): Promise<boolean> {
  // TODO: Implement proper admin role checking
  // For now, return true - in production this should check user roles
  return true
}

// Update post status (admin only)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    // Check admin permissions
    const isAdmin = await checkAdminPermissions(session.user.email)
    if (!isAdmin) {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const validation = postModerationSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(validation.error.errors, { status: 400 })
    }

    const { status, reason } = validation.data
    const { id } = await params

    // Check if post exists
    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        author: {
          select: { id: true, name: true, email: true }
        }
      }
    })

    if (!post) {
      return NextResponse.json({ message: 'Post not found' }, { status: 404 })
    }

    // Update post status
    const updatedPost = await prisma.post.update({
      where: { id },
      data: { status },
      include: {
        author: {
          select: { id: true, name: true, email: true }
        }
      }
    })

    // Log moderation action
    logger.contentModeration('post', id, status, session.user.email!, reason)

    // TODO: In production, send notification to post author about status change

    return NextResponse.json({
      message: 'Post status updated successfully',
      post: updatedPost,
      action: {
        moderator: session.user.email,
        newStatus: status,
        reason: reason || null,
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error("Error updating post status:", error)
    return NextResponse.json({ message: 'Error updating post status' }, { status: 500 })
  }
}

// Get post details including all content (admin view - shows hidden content)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    // Check admin permissions
    const isAdmin = await checkAdminPermissions(session.user.email)
    if (!isAdmin) {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 })
    }

    const { id } = await params
    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        author: {
          select: { id: true, name: true, email: true, image: true }
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
              select: { id: true, name: true, email: true, image: true }
            }
          }
        },
        replies: {
          // Admin view shows all replies regardless of status
          include: {
            author: {
              select: { id: true, name: true, email: true, image: true }
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
          // Admin view shows all comments regardless of status
          where: {
            parentId: null // Only top-level comments for MVP
          },
          include: {
            author: {
              select: { id: true, name: true, email: true, image: true }
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
    console.error("Error fetching post for admin:", error)
    return NextResponse.json({ message: 'Error fetching post' }, { status: 500 })
  }
}