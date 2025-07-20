import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { postCreateSchema } from '@/lib/validations'
import { requireAuth } from '@/lib/auth-utils'
import { handleApiError, parseRequestBody, successResponse } from '@/lib/api-utils'
import { AuthorizationError } from '@/lib/errors'

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
  let type: any, projectId: string | undefined, productId: string | undefined, parentId: string | undefined;
  
  try {
    const user = await requireAuth()
    const validationData = await parseRequestBody(request, postCreateSchema)

    type = validationData.type;
    projectId = validationData.projectId;
    productId = validationData.productId;
    parentId = validationData.parentId;
    const { content } = validationData;
    const userId = user.id

    // Check authorization
    const hasPermission = await checkPostCreatePermission(type, userId, projectId, productId)
    if (!hasPermission) {
      throw new AuthorizationError('Insufficient permissions')
    }

    // Additional validation for ANSWER type
    if (type === 'ANSWER' && parentId) {
      const parentPost = await prisma.post.findUnique({
        where: { id: parentId }
      })
      
      if (!parentPost || parentPost.type !== 'QUESTION') {
        throw new Error('Parent post must be a question')
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
          select: { id: true, name: true }
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

    return successResponse(post, 201)
  } catch (error) {
    // Log the error with structured logging
    logger.dbError('post creation', error as Error, { type, projectId, productId, parentId })
    return handleApiError(error, 'POST /api/posts')
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
          select: { id: true, name: true }
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

    return successResponse(posts)
  } catch (error) {
    return handleApiError(error, 'GET /api/posts')
  }
}