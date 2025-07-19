import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { productUpdateSchema } from "@/lib/validations"
import { requireAuth } from "@/lib/auth-utils"
import { handleApiError, parseRequestBody, successResponse } from "@/lib/api-utils"
import { AuthorizationError } from "@/lib/errors"

export const dynamic = 'force-dynamic'

// GET /api/products/[id] - Get product details with related projects
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const product = await prisma.product.findUnique({
      where: { id },
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
      throw new Error("Product not found")
    }

    return successResponse(product)
  } catch (error) {
    return handleApiError(error, "GET /api/products/[id]")
  }
}

// PUT /api/products/[id] - Update product (owner only)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params
    const validatedData = await parseRequestBody(request, productUpdateSchema)

    // Check if product exists and user owns it
    const existingProduct = await prisma.product.findUnique({
      where: { id: id }
    })

    if (!existingProduct) {
      throw new Error("Product not found")
    }

    if (existingProduct.ownerId !== user.id) {
      throw new AuthorizationError("You can only update your own products")
    }

    // Update product
    const product = await prisma.product.update({
      where: { id: id },
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

    return successResponse(product)
  } catch (error) {
    return handleApiError(error, "PUT /api/products/[id]")
  }
}

// DELETE /api/products/[id] - Delete product (owner only)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params

    // Check if product exists and user owns it
    const existingProduct = await prisma.product.findUnique({
      where: { id: id },
      include: {
        _count: {
          select: {
            projects: true
          }
        }
      }
    })

    if (!existingProduct) {
      throw new Error("Product not found")
    }

    if (existingProduct.ownerId !== user.id) {
      throw new AuthorizationError("You can only delete your own products")
    }

    // Check if product has associated projects
    if (existingProduct._count.projects > 0) {
      throw new Error("Cannot delete product with associated projects")
    }

    // Delete product
    await prisma.product.delete({
      where: { id: id }
    })

    return successResponse({ message: "Product deleted successfully" })
  } catch (error) {
    return handleApiError(error, "DELETE /api/products/[id]")
  }
}