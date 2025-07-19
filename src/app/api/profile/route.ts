import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { profileUpdateSchema } from "@/lib/validations"
import { requireAuth } from "@/lib/auth-utils"
import { handleApiError, parseRequestBody, successResponse } from "@/lib/api-utils"

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const user = await requireAuth()

    const userProfile = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        name: true,
        email: true,
        bio: true,
        specialty: true,
        experienceLevel: true,
        skills: true,
        linkedinUrl: true,
        githubUrl: true,
        portfolioUrl: true,
        availability: true,
        timezone: true,
      }
    })

    return successResponse(userProfile)
  } catch (error) {
    return handleApiError(error, "GET /api/profile")
  }
}

export async function PUT(request: Request) {
  try {
    const user = await requireAuth()
    const validatedData = await parseRequestBody(request, profileUpdateSchema)

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...validatedData,
        // Convert empty strings to null for optional URL fields
        linkedinUrl: validatedData.linkedinUrl === '' ? null : validatedData.linkedinUrl,
        githubUrl: validatedData.githubUrl === '' ? null : validatedData.githubUrl,
        portfolioUrl: validatedData.portfolioUrl === '' ? null : validatedData.portfolioUrl,
      },
      select: {
        id: true,
        name: true,
        email: true,
        bio: true,
        specialty: true,
        experienceLevel: true,
        skills: true,
        linkedinUrl: true,
        githubUrl: true,
        portfolioUrl: true,
        availability: true,
        timezone: true,
      }
    })

    return successResponse(updatedUser)
  } catch (error) {
    return handleApiError(error, "PUT /api/profile")
  }
}