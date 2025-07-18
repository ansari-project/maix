import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user ID from email
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

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

    return NextResponse.json({
      items: sortedItems.slice(0, 20) // Return top 20 items
    })
  } catch (error) {
    console.error("Feed fetch error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}