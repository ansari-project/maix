import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { z } from 'zod'

const postCreateSchema = z.object({
  type: z.enum(['QUESTION', 'ANSWER', 'PROJECT_UPDATE', 'PRODUCT_UPDATE']),
  content: z.string().min(1),
  projectId: z.string().cuid().optional(),
  productId: z.string().cuid().optional(),
  parentId: z.string().cuid().optional(),
})
.refine(data => !(data.type === 'PROJECT_UPDATE' && !data.projectId), {
  message: "projectId is required for PROJECT_UPDATE",
  path: ["projectId"],
})
.refine(data => !(data.type === 'PRODUCT_UPDATE' && !data.productId), {
  message: "productId is required for PRODUCT_UPDATE", 
  path: ["productId"],
})
.refine(data => !(data.type === 'ANSWER' && !data.parentId), {
  message: "parentId is required for ANSWER",
  path: ["parentId"],
})

// Note: PROJECT_DISCUSSION and PRODUCT_DISCUSSION posts are created automatically
// when projects/products are created, not through this endpoint

// Authorization helper function
async function checkPostCreatePermission(type: string, userId: string, projectId?: string, productId?: string) {
  switch (type) {
    case 'PROJECT_UPDATE':
      if (!projectId) return false
      // Check if user is project owner or accepted volunteer
      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
          OR: [
            { ownerId: userId },
            { applications: { some: { userId, status: 'ACCEPTED' } } }
          ]
        }
      })
      return !!project
    
    case 'PRODUCT_UPDATE':
      if (!productId) return false
      // Check if user is product owner
      const product = await prisma.product.findFirst({
        where: { id: productId, ownerId: userId }
      })
      return !!product
    
    case 'QUESTION':
    case 'ANSWER':
      return true // Anyone can ask questions or answer
    
    default:
      return false
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validation = postCreateSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(validation.error.errors, { status: 400 })
    }

    const { type, content, projectId, productId, parentId } = validation.data
    const userId = session.user.id

    // Check authorization
    const hasPermission = await checkPostCreatePermission(type, userId, projectId, productId)
    if (!hasPermission) {
      return NextResponse.json({ message: 'Insufficient permissions' }, { status: 403 })
    }

    // Additional validation for ANSWER type
    if (type === 'ANSWER' && parentId) {
      const parentPost = await prisma.post.findUnique({
        where: { id: parentId }
      })
      
      if (!parentPost || parentPost.type !== 'QUESTION') {
        return NextResponse.json({ 
          message: 'Parent post must be a question' 
        }, { status: 400 })
      }
    }

    const post = await prisma.post.create({
      data: {
        type,
        content,
        authorId: userId,
        projectId,
        productId,
        parentId,
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
        _count: {
          select: { 
            replies: true,
            comments: true 
          }
        }
      }
    })

    return NextResponse.json(post, { status: 201 })
  } catch (error) {
    // Log the error with structured logging
    logger.dbError('post creation', error as Error, { type, projectId, productId, parentId })
    return NextResponse.json({ message: 'Error creating post' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const take = parseInt(searchParams.get('take') || '20')
    const skip = parseInt(searchParams.get('skip') || '0')
    const type = searchParams.get('type')
    const projectId = searchParams.get('projectId')
    const productId = searchParams.get('productId')

    const where: any = {
      // Only show top-level posts in main feed (not answers or discussion threads)
      type: {
        in: ['QUESTION', 'PROJECT_UPDATE', 'PRODUCT_UPDATE'],
      },
      // Only show visible posts (content moderation)
      status: 'VISIBLE',
    }

    // Filter by specific type if provided
    if (type && ['QUESTION', 'PROJECT_UPDATE', 'PRODUCT_UPDATE'].includes(type)) {
      where.type = type
    }

    // Filter by project if provided
    if (projectId) {
      where.projectId = projectId
    }

    // Filter by product if provided
    if (productId) {
      where.productId = productId
    }

    const posts = await prisma.post.findMany({
      take,
      skip,
      where,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        author: {
          select: { id: true, name: true, image: true },
        },
        project: {
          select: { id: true, title: true }
        },
        product: {
          select: { id: true, name: true }
        },
        bestAnswer: {
          select: {
            id: true,
            content: true,
            author: {
              select: { id: true, name: true, image: true }
            }
          }
        },
        _count: {
          select: { 
            replies: true,
            comments: true 
          },
        }
      },
    })

    return NextResponse.json(posts)
  } catch (error) {
    console.error("Error fetching posts:", error)
    return NextResponse.json({ message: 'Error fetching posts' }, { status: 500 })
  }
}