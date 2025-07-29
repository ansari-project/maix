import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { handleApiError, successResponse } from "@/lib/api-utils"
import { filterPublicProduct, filterPublicProject } from "@/lib/public-data-filter"

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const product = await prisma.product.findUnique({
      where: { 
        id,
        visibility: 'PUBLIC'  // Only show public products
      },
      include: {
        owner: {
          select: { id: true, name: true }
        },
        projects: {
          where: { 
            isActive: true,
            visibility: 'PUBLIC'  // Only show public projects
          },
          include: {
            owner: {
              select: { id: true, name: true }
            },
            _count: {
              select: { applications: true }
            }
          }
        },
        _count: {
          select: { projects: true }
        }
      }
    })
    
    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      )
    }
    
    // Filter out sensitive data
    const publicProduct = filterPublicProduct(product)
    const publicProjects = product.projects.map(filterPublicProject)
    
    return successResponse({
      ...publicProduct,
      projects: publicProjects
    })
  } catch (error) {
    return handleApiError(error, "GET /api/public/products/[id]")
  }
}