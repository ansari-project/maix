import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { handleApiError, successResponse } from "@/lib/api-utils"
import { filterPublicProject } from "@/lib/public-data-filter"

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        owner: {
          select: { id: true, name: true }
        },
        _count: {
          select: { applications: true }
        }
      }
    })
    
    if (!project || !project.isActive) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      )
    }
    
    // Filter out sensitive data
    const publicProject = filterPublicProject(project)
    
    return successResponse(publicProject)
  } catch (error) {
    return handleApiError(error, "GET /api/public/projects/[id]")
  }
}