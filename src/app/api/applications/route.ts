import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-utils"
import { handleApiError, successResponse } from "@/lib/api-utils"

export const dynamic = 'force-dynamic'

// GET /api/applications - Get current user's applications
export async function GET(request: Request) {
  try {
    const user = await requireAuth()

    const applications = await prisma.application.findMany({
      where: {
        userId: user.id
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            helpType: true,
            owner: {
              select: {
                name: true,
                email: true
              }
            }
          }
        }
      },
      orderBy: {
        appliedAt: 'desc'
      }
    })

    return successResponse({ applications })
  } catch (error) {
    return handleApiError(error, "GET /api/applications")
  }
}