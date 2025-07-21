import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { handleApiError, successResponse } from "@/lib/api-utils"
import { filterPublicData } from "@/lib/public-data-filter"

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    
    // Build where clause for filtering
    const where: any = {}
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ]
    }
    
    const products = await prisma.product.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        owner: {
          select: { id: true, name: true }
        },
        _count: {
          select: { projects: true }
        }
      }
    })
    
    // Filter out sensitive data
    const publicProducts = filterPublicData(products, 'product')
    
    return successResponse({ products: publicProducts })
  } catch (error) {
    return handleApiError(error, "GET /api/public/products")
  }
}