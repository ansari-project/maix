import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { applicationUpdateSchema } from "@/lib/validations"
import { requireAuth } from "@/lib/auth-utils"
import { handleApiError, parseRequestBody, successResponse } from "@/lib/api-utils"
import { AuthorizationError } from "@/lib/errors"

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params
    const { status, message } = await parseRequestBody(request, applicationUpdateSchema)

    const application = await prisma.application.findUnique({
      where: { id },
      include: {
        project: {
          include: {
            owner: true
          }
        }
      }
    })

    if (!application) {
      throw new Error("Application not found")
    }

    // Check if user is the project owner
    if (application.project.owner.id !== user.id) {
      throw new AuthorizationError("Only project owners can update applications")
    }

    const updatedApplication = await prisma.application.update({
      where: { id },
      data: { 
        status,
        message,
        respondedAt: new Date()
      },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    })

    return successResponse(updatedApplication)
  } catch (error) {
    return handleApiError(error, "PATCH /api/applications/[id]")
  }
}