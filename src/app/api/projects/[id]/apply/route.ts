import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { applicationCreateSchema } from "@/lib/validations"
import { requireAuth } from "@/lib/auth-utils"
import { handleApiError, parseRequestBody, successResponse } from "@/lib/api-utils"

export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params
    const { message } = await parseRequestBody(request, applicationCreateSchema)

    const project = await prisma.project.findUnique({
      where: { id: id },
      include: {
        applications: true
      }
    })

    if (!project) {
      throw new Error("Project not found")
    }

    // Check if user already applied
    const existingApplication = await prisma.application.findUnique({
      where: {
        userId_projectId: {
          userId: user.id,
          projectId: id
        }
      }
    })

    if (existingApplication) {
      throw new Error("You have already applied to this project")
    }

    // Check if project is full
    if (project.applications.length >= project.maxVolunteers) {
      throw new Error("This project has reached its volunteer limit")
    }

    const application = await prisma.application.create({
      data: {
        message,
        userId: user.id,
        projectId: id
      },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        },
        project: {
          select: {
            title: true
          }
        }
      }
    })

    return successResponse(application, 201)
  } catch (error) {
    return handleApiError(error, "POST /api/projects/[id]/apply")
  }
}