import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-utils"
import { handleApiError, successResponse } from "@/lib/api-utils"

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const user = await requireAuth()

    // Query existing models directly as per the simplified approach
    const [projects, applications, productUpdates, products] = await Promise.all([
      prisma.project.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { 
          owner: { select: { id: true, name: true } }
        }
      }),
      prisma.application.findMany({
        take: 10,
        orderBy: { appliedAt: 'desc' },
        include: { 
          user: { select: { id: true, name: true } },
          project: { select: { id: true, name: true } }
        }
      }),
      prisma.post.findMany({
        where: { type: 'PRODUCT_UPDATE' },
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          author: { select: { id: true, name: true } },
          product: { select: { id: true, name: true } }
        }
      }),
      prisma.product.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { 
          owner: { select: { id: true, name: true } },
          _count: { select: { projects: true } }
        }
      })
    ])

    // Transform to unified format
    const feedItems = [
      ...projects.map(p => ({
        id: p.id,
        type: 'project_created' as const,
        title: `New project: ${p.name}`,
        timestamp: p.createdAt,
        user: p.owner,
        data: p
      })),
      ...applications.map(a => ({
        id: a.id,
        type: 'volunteer_applied' as const,
        title: `${a.user.name} volunteered for ${a.project.name}`,
        timestamp: a.appliedAt,
        user: a.user,
        data: a
      })),
      ...productUpdates.map(p => ({
        id: p.id,
        type: 'product_update' as const,
        title: `Product update: ${p.product?.name || 'Unknown Product'}`,
        timestamp: p.createdAt,
        user: p.author,
        data: {
          ...p,
          content: p.content
        }
      })),
      ...products.map(p => ({
        id: p.id,
        type: 'product_created' as const,
        title: `New product: ${p.name}`,
        timestamp: p.createdAt,
        user: p.owner,
        data: p
      }))
    ]

    // Sort by timestamp
    const sortedItems = feedItems.sort((a, b) => 
      b.timestamp.getTime() - a.timestamp.getTime()
    )

    return successResponse({
      items: sortedItems.slice(0, 20) // Return top 20 items
    })
  } catch (error) {
    return handleApiError(error, "GET /api/feed")
  }
}