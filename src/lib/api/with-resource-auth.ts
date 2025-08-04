import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { withAuth, type AuthenticatedRequest } from './with-auth'
import type { Project, Product, Organization, Post } from '@prisma/client'

interface ResourceRequest<T> extends AuthenticatedRequest {
  resource: T
  resourceId: string
}

type ResourceHandler<T> = (
  request: ResourceRequest<T>
) => Promise<Response> | Response

/**
 * Higher-order function that ensures the user has access to a specific project
 */
export function withProjectAuth(handler: ResourceHandler<Project>) {
  return withAuth(async (request: AuthenticatedRequest): Promise<Response> => {
    // Extract project ID from URL
    const url = new URL(request.url)
    const segments = url.pathname.split('/')
    const projectIdIndex = segments.indexOf('projects') + 1
    const projectId = segments[projectIdIndex]

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      )
    }

    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [
          // Direct project membership
          {
            members: {
              some: { userId: request.user.id }
            }
          },
          // Product membership
          {
            product: {
              members: {
                some: { userId: request.user.id }
              }
            }
          },
          // Organization membership
          { 
            organization: {
              members: {
                some: { userId: request.user.id }
              }
            }
          }
        ]
      }
    })

    if (!project) {
      logger.warn('Project access denied', {
        projectId,
        userId: request.user.id,
        method: request.method
      })
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 404 }
      )
    }

    const resourceRequest = request as ResourceRequest<Project>
    resourceRequest.resource = project
    resourceRequest.resourceId = projectId

    return handler(resourceRequest)
  })
}

/**
 * Higher-order function that ensures the user has access to a specific product
 */
export function withProductAuth(handler: ResourceHandler<Product>) {
  return withAuth(async (request: AuthenticatedRequest): Promise<Response> => {
    const url = new URL(request.url)
    const segments = url.pathname.split('/')
    const productIdIndex = segments.indexOf('products') + 1
    const productId = segments[productIdIndex]

    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      )
    }

    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        OR: [
          // Direct product membership
          {
            members: {
              some: { userId: request.user.id }
            }
          },
          // Organization membership
          { 
            organization: {
              members: {
                some: { userId: request.user.id }
              }
            }
          }
        ]
      }
    })

    if (!product) {
      logger.warn('Product access denied', {
        productId,
        userId: request.user.id,
        method: request.method
      })
      return NextResponse.json(
        { error: 'Product not found or access denied' },
        { status: 404 }
      )
    }

    const resourceRequest = request as ResourceRequest<Product>
    resourceRequest.resource = product
    resourceRequest.resourceId = productId

    return handler(resourceRequest)
  })
}

/**
 * Higher-order function that ensures the user is a member of the organization
 */
export function withOrganizationAuth(handler: ResourceHandler<Organization>) {
  return withAuth(async (request: AuthenticatedRequest): Promise<Response> => {
    const url = new URL(request.url)
    const segments = url.pathname.split('/')
    const orgIdIndex = segments.indexOf('organizations') + 1
    const organizationId = segments[orgIdIndex]

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      )
    }

    const organization = await prisma.organization.findFirst({
      where: {
        id: organizationId,
        members: {
          some: { userId: request.user.id }
        }
      }
    })

    if (!organization) {
      logger.warn('Organization access denied', {
        organizationId,
        userId: request.user.id,
        method: request.method
      })
      return NextResponse.json(
        { error: 'Organization not found or access denied' },
        { status: 404 }
      )
    }

    const resourceRequest = request as ResourceRequest<Organization>
    resourceRequest.resource = organization
    resourceRequest.resourceId = organizationId

    return handler(resourceRequest)
  })
}

/**
 * Higher-order function that ensures the user owns the post
 */
export function withPostAuth(handler: ResourceHandler<Post>) {
  return withAuth(async (request: AuthenticatedRequest): Promise<Response> => {
    const url = new URL(request.url)
    const segments = url.pathname.split('/')
    const postIdIndex = segments.indexOf('posts') + 1
    const postId = segments[postIdIndex]

    if (!postId) {
      return NextResponse.json(
        { error: 'Post ID is required' },
        { status: 400 }
      )
    }

    const post = await prisma.post.findFirst({
      where: {
        id: postId,
        authorId: request.user.id
      }
    })

    if (!post) {
      logger.warn('Post access denied', {
        postId,
        userId: request.user.id,
        method: request.method
      })
      return NextResponse.json(
        { error: 'Post not found or access denied' },
        { status: 404 }
      )
    }

    const resourceRequest = request as ResourceRequest<Post>
    resourceRequest.resource = post
    resourceRequest.resourceId = postId

    return handler(resourceRequest)
  })
}