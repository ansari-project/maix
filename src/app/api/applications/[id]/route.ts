import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { applicationUpdateSchema } from "@/lib/validations"
import { requireAuth } from "@/lib/auth-utils"
import { handleApiError, parseRequestBody, successResponse } from "@/lib/api-utils"
import { AuthorizationError } from "@/lib/errors"
import { hasResourceAccess } from "@/lib/ownership-utils"

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
            owner: true,
            organization: true
          }
        }
      }
    })

    if (!application) {
      throw new Error("Application not found")
    }

    // Check if user can manage the project (owner or org member)
    const canManage = await hasResourceAccess(user.id, application.project, 'update')
    if (!canManage) {
      throw new AuthorizationError("You don't have permission to update applications for this project")
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