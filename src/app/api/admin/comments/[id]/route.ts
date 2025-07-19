import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const commentModerationSchema = z.object({
  status: z.enum(['VISIBLE', 'HIDDEN', 'PENDING_REVIEW']),
  reason: z.string().optional(),
})

// Check if user is admin (for now, just check if they exist - enhance with proper role system later)
async function checkAdminPermissions(userEmail: string): Promise<boolean> {
  // TODO: Implement proper admin role checking
  // For now, return true - in production this should check user roles
  return true
}

// Update comment status (admin only)
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
    const validation = commentModerationSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(validation.error.errors, { status: 400 })
    }

    const { status, reason } = validation.data
    const { id } = await params

    // Check if comment exists
    const comment = await prisma.comment.findUnique({
      where: { id },
      include: {
        author: {
          select: { id: true, name: true, email: true }
        },
        post: {
          select: { id: true, type: true, content: true }
        }
      }
    })

    if (!comment) {
      return NextResponse.json({ message: 'Comment not found' }, { status: 404 })
    }

    // Update comment status
    const updatedComment = await prisma.comment.update({
      where: { id },
      data: { status },
      include: {
        author: {
          select: { id: true, name: true, email: true }
        },
        post: {
          select: { id: true, type: true }
        }
      }
    })

    // TODO: Log moderation action
    console.log(`Comment ${id} status changed to ${status} by ${session.user.email}${reason ? `. Reason: ${reason}` : ''}`)

    // TODO: In production, send notification to comment author about status change

    return NextResponse.json({
      message: 'Comment status updated successfully',
      comment: updatedComment,
      action: {
        moderator: session.user.email,
        newStatus: status,
        reason: reason || null,
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error("Error updating comment status:", error)
    return NextResponse.json({ message: 'Error updating comment status' }, { status: 500 })
  }
}

// Get comment details (admin view - shows all content regardless of status)
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
    const comment = await prisma.comment.findUnique({
      where: { id },
      include: {
        author: {
          select: { id: true, name: true, email: true, image: true }
        },
        post: {
          select: { id: true, type: true, content: true, author: {
            select: { id: true, name: true, email: true }
          }}
        },
        replies: {
          // Admin view shows all replies regardless of status
          include: {
            author: {
              select: { id: true, name: true, email: true, image: true }
            }
          },
          orderBy: {
            createdAt: 'asc'
          }
        }
      }
    })

    if (!comment) {
      return NextResponse.json({ message: 'Comment not found' }, { status: 404 })
    }

    return NextResponse.json(comment)
  } catch (error) {
    console.error("Error fetching comment for admin:", error)
    return NextResponse.json({ message: 'Error fetching comment' }, { status: 500 })
  }
}