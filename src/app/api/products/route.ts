import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { productCreateSchema } from "@/lib/validations"
import { requireAuth } from "@/lib/auth-utils"
import { handleApiError, parseRequestBody, successResponse } from "@/lib/api-utils"
import { authOptions } from "@/lib/auth"
import { getServerSession } from "next-auth/next"
import { validateOwnership } from "@/lib/ownership-utils"

export const dynamic = 'force-dynamic'

// GET /api/products - List all products
export async function GET() {
  try {
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
      return successResponse(products)
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

    return successResponse(products)
  } catch (error) {
    return handleApiError(error, "GET /api/products")
  }
}

// POST /api/products - Create new product
export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    const validatedData = await parseRequestBody(request, productCreateSchema)

    // Create product with associated discussion post
    const product = await prisma.$transaction(async (tx) => {
      // Prepare ownership data
      let ownerId: string | null = user.id
      let organizationId: string | null = null

      // If organizationId is provided, validate membership and set ownership
      if (validatedData.organizationId) {
        const isMember = await tx.organizationMember.findUnique({
          where: {
            organizationId_userId: {
              organizationId: validatedData.organizationId,
              userId: user.id
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
          authorId: user.id,
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

    return successResponse(product, 201)
  } catch (error) {
    return handleApiError(error, "POST /api/products")
  }
}