import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const ADMIN_EMAIL = 'waleedk@gmail.com'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user?.email !== ADMIN_EMAIL) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Get total users
    const totalUsers = await prisma.user.count()
    
    // Get active users
    const activeUsers = await prisma.user.count({
      where: { isActive: true }
    })
    
    // Get users registered in last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const recentUsers = await prisma.user.count({
      where: {
        createdAt: {
          gte: thirtyDaysAgo
        }
      }
    })
    
    // Get users with projects
    const usersWithProjects = await prisma.user.count({
      where: {
        projects: {
          some: {}
        }
      }
    })
    
    // Get users with applications
    const usersWithApplications = await prisma.user.count({
      where: {
        applications: {
          some: {}
        }
      }
    })
    
    // Get users with products
    const usersWithProducts = await prisma.user.count({
      where: {
        products: {
          some: {}
        }
      }
    })
    
    // Get total counts
    const totalProjects = await prisma.project.count()
    const totalProducts = await prisma.product.count()
    const totalApplications = await prisma.application.count()
    const totalPosts = await prisma.post.count()
    
    // Get recent users with details
    const recentUsersList = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        isActive: true,
        _count: {
          select: {
            projects: true,
            products: true,
            applications: true,
            posts: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    })
    
    // Get engagement by user type
    const projectOwners = await prisma.user.findMany({
      where: {
        projects: {
          some: {}
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        _count: {
          select: {
            projects: true
          }
        }
      }
    })
    
    const volunteers = await prisma.user.findMany({
      where: {
        applications: {
          some: {}
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        _count: {
          select: {
            applications: true
          }
        }
      }
    })

    return NextResponse.json({
      overview: {
        totalUsers,
        activeUsers,
        recentUsers,
        usersWithProjects,
        usersWithApplications,
        usersWithProducts
      },
      content: {
        totalProjects,
        totalProducts,
        totalApplications,
        totalPosts
      },
      recentUsers: recentUsersList,
      projectOwners,
      volunteers,
      generatedAt: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error fetching admin stats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}