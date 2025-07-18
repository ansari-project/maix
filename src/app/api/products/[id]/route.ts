import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

export const dynamic = 'force-dynamic'

// Validation schema for product updates
const updateProductSchema = z.object({
  name: z.string().min(1, "Product name is required").optional(),
  description: z.string().min(1, "Product description is required").optional(),
  url: z.string().url("Invalid URL").optional().or(z.literal("")),
})

// GET /api/products/[id] - Get product details with related projects
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const product = await prisma.product.findUnique({
      where: { id: params.id },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        projects: {
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
                applications: true
              }
            }
          }
        }
      }
    })

    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(product)
  } catch (error) {
    console.error("Error fetching product:", error)
    return NextResponse.json(
      { error: "Failed to fetch product" },
      { status: 500 }
    )
  }
}

// PUT /api/products/[id] - Update product (owner only)
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
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

    // Check if product exists and user owns it
    const existingProduct = await prisma.product.findUnique({
      where: { id: params.id }
    })

    if (!existingProduct) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      )
    }

    if (existingProduct.ownerId !== user.id) {
      return NextResponse.json(
        { error: "Unauthorized - you can only update your own products" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validatedData = updateProductSchema.parse(body)

    // Update product
    const product = await prisma.product.update({
      where: { id: params.id },
      data: {
        ...(validatedData.name && { name: validatedData.name }),
        ...(validatedData.description && { description: validatedData.description }),
        ...(validatedData.url !== undefined && { url: validatedData.url || null }),
      },
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

    return NextResponse.json(product)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Error updating product:", error)
    return NextResponse.json(
      { error: "Failed to update product" },
      { status: 500 }
    )
  }
}

// DELETE /api/products/[id] - Delete product (owner only)
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
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

    // Check if product exists and user owns it
    const existingProduct = await prisma.product.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            projects: true
          }
        }
      }
    })

    if (!existingProduct) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      )
    }

    if (existingProduct.ownerId !== user.id) {
      return NextResponse.json(
        { error: "Unauthorized - you can only delete your own products" },
        { status: 403 }
      )
    }

    // Check if product has associated projects
    if (existingProduct._count.projects > 0) {
      return NextResponse.json(
        { error: "Cannot delete product with associated projects" },
        { status: 400 }
      )
    }

    // Delete product
    await prisma.product.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ message: "Product deleted successfully" })
  } catch (error) {
    console.error("Error deleting product:", error)
    return NextResponse.json(
      { error: "Failed to delete product" },
      { status: 500 }
    )
  }
}