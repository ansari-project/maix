import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { hasResourceAccess } from "@/lib/ownership-utils"
import { logger } from "@/lib/logger"
import { deleteProject } from "@/lib/services/project.service"

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
    logger.error("Project fetch error", error, { projectId: (await params).id })
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: projectId } = await params

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }

    await deleteProject(projectId, session.user.id)
    return NextResponse.json({ message: 'Project deleted successfully' }, { status: 200 })
  } catch (error) {
    logger.error("Project delete error", error, { projectId: (await params).id })
    if (error instanceof Error) {
      if (error.message === 'Project not found') {
        return NextResponse.json({ error: error.message }, { status: 404 })
      }
      if (error.message === 'Only the owner can delete a project') {
        return NextResponse.json({ error: error.message }, { status: 403 })
      }
    }
    return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 })
  }
}