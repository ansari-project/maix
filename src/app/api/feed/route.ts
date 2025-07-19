import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-utils"
import { handleApiError, successResponse } from "@/lib/api-utils"

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const user = await requireAuth()

    // Query existing models directly as per the simplified approach
    const [projects, applications] = await Promise.all([
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
          project: { select: { id: true, title: true } }
        }
      })
    ])

    // Transform to unified format
    const feedItems = [
      ...projects.map(p => ({
        id: p.id,
        type: 'project_created' as const,
        title: `New project: ${p.title}`,
        timestamp: p.createdAt,
        user: p.owner,
        data: p
      })),
      ...applications.map(a => ({
        id: a.id,
        type: 'volunteer_applied' as const,
        title: `${a.user.name} volunteered for ${a.project.title}`,
        timestamp: a.appliedAt,
        user: a.user,
        data: a
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