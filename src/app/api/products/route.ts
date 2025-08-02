import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { productCreateSchema } from "@/lib/validations"
import { validateOwnership } from "@/lib/ownership-utils"
import { apiHandler } from '@/lib/api/api-handler'
import { withAuth, type AuthenticatedRequest } from '@/lib/api/with-auth'
import { logger } from '@/lib/logger'
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"

export const dynamic = 'force-dynamic'

// GET /api/products - List all products
const handleGet = async (request: Request) => {
  // Get current user session (if any)
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id

  if (!userId) {
    // No session - only return public products
    const products = await prisma.product.findMany({
      where: {
        visibility: 'PUBLIC'
      },
      orderBy: { createdAt: 'desc' },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        organization: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        },
        _count: {
          select: {
            projects: true
          }
        }
      }
    })
    
    logger.apiResponse('GET', '/api/products', 200, 0)
    return NextResponse.json(products)
  }

  // Use a single optimized query with OR conditions
  const products = await prisma.product.findMany({
    where: {
      OR: [
        { visibility: 'PUBLIC' },
        { ownerId: userId },
        { 
          organization: { 
            members: { 
              some: { userId } 
            } 
          } 
        }
      ]
    },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          email: true
        }
      },
      organization: {
        select: {
          id: true,
          name: true,
          slug: true
        }
      },
      _count: {
        select: {
          projects: true
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 50
  })

  logger.apiResponse('GET', '/api/products', 200, 0)
  return NextResponse.json(products)
}

// POST /api/products - Create new product
const handlePost = withAuth(async (request: AuthenticatedRequest) => {
  const body = await request.json()
  const validatedData = productCreateSchema.parse(body)

  // Create product with associated discussion post
  const product = await prisma.$transaction(async (tx) => {
    // Prepare ownership data
    let ownerId: string | null = request.user.id
    let organizationId: string | null = null

    // If organizationId is provided, validate membership and set ownership
    if (validatedData.organizationId) {
      const isMember = await tx.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId: validatedData.organizationId,
            userId: request.user.id
          }
        }
      })

      if (!isMember) {
        throw new Error('You must be a member of the organization to create products under it')
      }

      // Set organization ownership
      ownerId = null
      organizationId = validatedData.organizationId
    }

    // Validate ownership constraint
    validateOwnership({ ownerId, organizationId })

    // 1. Create the product first
    const newProduct = await tx.product.create({
      data: {
        name: validatedData.name,
        description: validatedData.description,
        url: validatedData.url || null,
        visibility: validatedData.visibility || 'PUBLIC',
        ownerId,
        organizationId
      }
    })

    // 2. Create the discussion post and link it to the product
    await tx.post.create({
      data: {
        type: 'PRODUCT_DISCUSSION',
        authorId: request.user.id,
        content: `Discussion thread for ${newProduct.name}`,
        productDiscussionThreadId: newProduct.id, // Post holds FK to Product
      }
    })

    // 3. Return the product with includes
    return tx.product.findUnique({
      where: { id: newProduct.id },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        organization: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      }
    })
  })

  if (!product) {
    throw new Error('Failed to create product')
  }

  logger.info('Product created', {
    productId: product.id,
    name: product.name,
    userId: request.user.id,
    organizationId: product.organizationId
  })

  return NextResponse.json(product, { status: 201 })
})

export const GET = apiHandler({ GET: handleGet })
export const POST = apiHandler({ POST: handlePost })