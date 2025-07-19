import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

export const dynamic = 'force-dynamic'

// Validation schema for product creation
const createProductSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  description: z.string().min(1, "Product description is required"),
  url: z.string().url("Invalid URL").optional().or(z.literal("")),
})

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

    return NextResponse.json(products)
  } catch (error) {
    console.error("Error fetching products:", error)
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    )
  }
}

// POST /api/products - Create new product
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    // Get user ID from session
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    const body = await request.json()
    const validatedData = createProductSchema.parse(body)

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

    return NextResponse.json(product, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Error creating product:", error)
    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 }
    )
  }
}