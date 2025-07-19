import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { productCreateSchema } from "@/lib/validations"
import { requireAuth } from "@/lib/auth-utils"
import { handleApiError, parseRequestBody, successResponse } from "@/lib/api-utils"

export const dynamic = 'force-dynamic'

// GET /api/products - List all products
export async function GET() {
  try {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true
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
      // 1. Create the product first
      const newProduct = await tx.product.create({
        data: {
          name: validatedData.name,
          description: validatedData.description,
          url: validatedData.url || null,
          ownerId: user.id
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