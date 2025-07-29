import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { productUpdateSchema } from "@/lib/validations"
import { requireAuth } from "@/lib/auth-utils"
import { handleApiError, parseRequestBody, successResponse } from "@/lib/api-utils"
import { AuthorizationError } from "@/lib/errors"
import { authOptions } from "@/lib/auth"
import { getServerSession } from "next-auth/next"
import { hasResourceAccess } from "@/lib/ownership-utils"

export const dynamic = 'force-dynamic'

// GET /api/products/[id] - Get product details with related projects
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Get current user session (if any)
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id
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
        organization: {
          select: {
            id: true,
            name: true,
            slug: true
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
            organization: {
              select: {
                id: true,
                name: true,
                slug: true
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

    // Check access permissions using hasResourceAccess
    if (userId) {
      const hasAccess = await hasResourceAccess(userId, product, 'read')
      if (!hasAccess) {
        // Return generic error to not reveal existence of private products
        throw new Error("Product not found")
      }
    } else if (product.visibility === 'PRIVATE') {
      // No user session and product is private
      throw new Error("Product not found")
    }

    // Filter out private projects if user doesn't have access
    if (product.projects) {
      const projectAccessChecks = await Promise.all(
        product.projects.map(async (project) => {
          if (!userId) return project.visibility === 'PUBLIC'
          return hasResourceAccess(userId, project, 'read')
        })
      )
      
      product.projects = product.projects.filter((_, index) => projectAccessChecks[index])
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

    const canUpdate = await hasResourceAccess(user.id, existingProduct, 'update')
    if (!canUpdate) {
      throw new AuthorizationError("You don't have permission to update this product")
    }

    // Update product
    const product = await prisma.product.update({
      where: { id: id },
      data: {
        ...(validatedData.name && { name: validatedData.name }),
        ...(validatedData.description && { description: validatedData.description }),
        ...(validatedData.url !== undefined && { url: validatedData.url || null }),
        ...(validatedData.visibility && { visibility: validatedData.visibility }),
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

    const canDelete = await hasResourceAccess(user.id, existingProduct, 'delete')
    if (!canDelete) {
      throw new AuthorizationError("You don't have permission to delete this product")
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