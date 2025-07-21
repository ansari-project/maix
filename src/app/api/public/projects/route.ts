import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { handleApiError, successResponse } from "@/lib/api-utils"
import { filterPublicData } from "@/lib/public-data-filter"

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const projectType = searchParams.get('projectType')
    const helpType = searchParams.get('helpType')
    
    // Build where clause for filtering
    const where: any = {
      isActive: true
    }
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { goal: { contains: search, mode: 'insensitive' } }
      ]
    }
    
    if (projectType) {
      where.projectType = projectType
    }
    
    if (helpType) {
      where.helpType = helpType
    }
    
    const projects = await prisma.project.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        owner: {
          select: { id: true, name: true }
        },
        _count: {
          select: { applications: true }
        }
      }
    })
    
    // Filter out sensitive data
    const publicProjects = filterPublicData(projects, 'project')
    
    return successResponse({ projects: publicProjects })
  } catch (error) {
    return handleApiError(error, "GET /api/public/projects")
  }
}