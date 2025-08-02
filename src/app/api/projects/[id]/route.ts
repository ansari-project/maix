import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { hasResourceAccess } from "@/lib/ownership-utils"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Get current user session (if any)
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id
    
    const project = await prisma.project.findUnique({
      where: {
        id
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
        },
        applications: {
          include: {
            user: {
              select: {
                name: true,
                email: true
              }
            }
          },
          orderBy: {
            appliedAt: 'desc'
          }
        }
      }
    })

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    // Check access permissions using hasResourceAccess
    if (userId) {
      const hasAccess = await hasResourceAccess(userId, project, 'read')
      if (!hasAccess) {
        // Return 404 to not reveal existence of private projects
        return NextResponse.json({ error: "Project not found" }, { status: 404 })
      }
    } else if (project.visibility === 'PRIVATE') {
      // No user session and project is private
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    return NextResponse.json(project)
  } catch (error) {
    console.error("Project fetch error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}