import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Check if user is admin (for now, just check if they exist - enhance with proper role system later)
async function checkAdminPermissions(userEmail: string): Promise<boolean> {
  // TODO: Implement proper admin role checking
  // For now, return true - in production this should check user roles
  return true
}

// Get content requiring moderation (admin only)
export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url)
    const take = parseInt(searchParams.get('take') || '20')
    const skip = parseInt(searchParams.get('skip') || '0')
    const status = searchParams.get('status') // Filter by specific status
    const type = searchParams.get('type') // 'posts' or 'comments'

    const results: any = {
      posts: [],
      comments: [],
      summary: {
        totalHidden: 0,
        totalPendingReview: 0,
        totalVisible: 0
      }
    }

    // Get posts requiring moderation
    if (!type || type === 'posts') {
      const postWhere: any = {}
      if (status && ['VISIBLE', 'HIDDEN', 'PENDING_REVIEW'].includes(status)) {
        postWhere.status = status
      } else {
        // Default: show hidden and pending content
        postWhere.status = { in: ['HIDDEN', 'PENDING_REVIEW'] }
      }

      const posts = await prisma.post.findMany({
        where: postWhere,
        take,
        skip,
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
          _count: {
            select: { 
              replies: true,
              comments: true 
            }
          }
        },
        orderBy: {
          updatedAt: 'desc'
        }
      })

      results.posts = posts
    }

    // Get comments requiring moderation
    if (!type || type === 'comments') {
      const commentWhere: any = {}
      if (status && ['VISIBLE', 'HIDDEN', 'PENDING_REVIEW'].includes(status)) {
        commentWhere.status = status
      } else {
        // Default: show hidden and pending content
        commentWhere.status = { in: ['HIDDEN', 'PENDING_REVIEW'] }
      }

      const comments = await prisma.comment.findMany({
        where: commentWhere,
        take,
        skip,
        include: {
          author: {
            select: { id: true, name: true, email: true, image: true }
          },
          post: {
            select: { id: true, type: true, content: true }
          }
        },
        orderBy: {
          updatedAt: 'desc'
        }
      })

      results.comments = comments
    }

    // Get summary statistics
    const [postStats, commentStats] = await Promise.all([
      prisma.post.groupBy({
        by: ['status'],
        _count: true
      }),
      prisma.comment.groupBy({
        by: ['status'],
        _count: true
      })
    ])

    // Calculate summary
    results.summary = {
      posts: {
        visible: postStats.find(s => s.status === 'VISIBLE')?._count || 0,
        hidden: postStats.find(s => s.status === 'HIDDEN')?._count || 0,
        pendingReview: postStats.find(s => s.status === 'PENDING_REVIEW')?._count || 0
      },
      comments: {
        visible: commentStats.find(s => s.status === 'VISIBLE')?._count || 0,
        hidden: commentStats.find(s => s.status === 'HIDDEN')?._count || 0,
        pendingReview: commentStats.find(s => s.status === 'PENDING_REVIEW')?._count || 0
      }
    }

    return NextResponse.json({
      data: results,
      pagination: {
        take,
        skip,
        hasMore: results.posts.length === take || results.comments.length === take
      }
    })
  } catch (error) {
    console.error("Error fetching moderation queue:", error)
    return NextResponse.json({ message: 'Error fetching moderation queue' }, { status: 500 })
  }
}