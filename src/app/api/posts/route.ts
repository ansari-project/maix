import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { postCreateSchema } from '@/lib/validations'
import { requireAuth } from '@/lib/auth-utils'
import { handleApiError, parseRequestBody, successResponse } from '@/lib/api-utils'
import { AuthorizationError } from '@/lib/errors'
import { NotificationService } from '@/services/notification.service'

// Note: PROJECT_DISCUSSION and PRODUCT_DISCUSSION posts are created automatically
// when projects/products are created, not through this endpoint

// Authorization helper function - returns the entity if authorized, null otherwise
async function checkPostCreatePermission(type: string, userId: string, projectId?: string, productId?: string) {
  switch (type) {
    case 'PROJECT_UPDATE':
      if (!projectId) return null
      // Check if user is project owner or accepted volunteer
      // Note: Only owners can update project status, but volunteers can post updates
      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
          OR: [
            { ownerId: userId },
            { applications: { some: { userId, status: 'ACCEPTED' } } }
          ]
        }
      })
      return project
    
    case 'PRODUCT_UPDATE':
      if (!productId) return null
      // Check if user is product owner
      const product = await prisma.product.findFirst({
        where: { id: productId, ownerId: userId }
      })
      return product
    
    case 'QUESTION':
    case 'ANSWER':
      return {} // Return truthy value for questions/answers
    
    default:
      return null
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
    const { content, projectStatus, todoId } = validationData;
    const userId = user.id

    // Check authorization and get the entity
    const authorizedEntity = await checkPostCreatePermission(type, userId, projectId, productId)
    if (!authorizedEntity) {
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

    // If updating project status, verify user is project owner
    if (type === 'PROJECT_UPDATE' && projectStatus && projectId) {
      // We already have the project from checkPostCreatePermission
      const project = authorizedEntity as any
      
      if (!project.ownerId || project.ownerId !== userId) {
        throw new AuthorizationError('Only project owners can update project status')
      }
    }

    // Create post and optionally update project status in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // If todoId is provided, validate it belongs to the same project
      if (todoId && projectId) {
        const todo = await tx.todo.findUnique({
          where: { id: todoId },
          select: { projectId: true }
        })
        
        if (!todo || todo.projectId !== projectId) {
          throw new Error('Todo must belong to the same project as the post')
        }
      }

      // Create the post
      const post = await tx.post.create({
        data: {
          type,
          content,
          authorId: userId,
          projectId,
          productId,
          parentId,
          todoId,
        },
        include: {
          author: {
            select: { id: true, name: true, image: true }
          },
          project: {
            select: { id: true, name: true, status: true }
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

      // Update project status if requested
      if (type === 'PROJECT_UPDATE' && projectStatus && projectId) {
        await tx.project.update({
          where: { id: projectId },
          data: { 
            status: projectStatus,
            // If project is completed or cancelled, it should no longer be active
            isActive: !['COMPLETED', 'CANCELLED'].includes(projectStatus)
          }
        })
        
        // Update the post to reflect the new status
        post.project!.status = projectStatus
      }

      return post
    })

    // Send notification for new answer
    if (type === 'ANSWER' && parentId) {
      const question = await prisma.post.findUnique({
        where: { id: parentId },
        include: { author: true }
      })
      
      if (question && question.authorId && question.authorId !== userId) {
        await NotificationService.createAnswerNew({
          questionAuthorId: question.authorId,
          answererName: user.name || 'Someone',
          questionTitle: question.content.substring(0, 100),
          questionId: parentId,
          answerId: result.id
        })
      }
    }

    // Send notification for new question (to all active users)
    if (type === 'QUESTION') {
      const activeUsers = await prisma.user.findMany({
        where: { 
          isActive: true,
          id: { not: userId } // Don't notify the author
        },
        select: { id: true }
      })

      // Create notifications for each user (we can optimize this later with batching)
      for (const activeUser of activeUsers) {
        await NotificationService.createNewQuestion({
          userId: activeUser.id,
          questionTitle: content.substring(0, 100),
          authorName: user.name || 'Someone',
          questionId: result.id
        })
      }
    }

    return successResponse(result, 201)
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
    const parentId = searchParams.get('parentId')

    const where: any = {}
    
    // If parentId is provided, we're fetching replies/answers
    if (parentId) {
      where.parentId = parentId
    } else {
      // Only show top-level posts in main feed (not answers or discussion threads)
      where.type = {
        in: ['QUESTION', 'PROJECT_UPDATE', 'PRODUCT_UPDATE'],
      }
    }

    // Filter by specific type if provided
    if (type) {
      // When fetching replies (parentId is set), allow ANSWER type
      const allowedTypes = parentId 
        ? ['ANSWER', 'PROJECT_DISCUSSION', 'PRODUCT_DISCUSSION']
        : ['QUESTION', 'PROJECT_UPDATE', 'PRODUCT_UPDATE']
      
      if (allowedTypes.includes(type)) {
        where.type = type
      }
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