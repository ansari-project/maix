import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createOrganizationSchema } from '@/lib/validations/organization'
import { handleApiError, successResponse } from '@/lib/api-utils'

// GET /api/organizations - List user's organizations
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const organizations = await prisma.organization.findMany({
      where: {
        members: {
          some: {
            userId: session.user.id
          }
        }
      },
      include: {
        members: {
          where: {
            userId: session.user.id
          },
          select: {
            role: true
          }
        },
        _count: {
          select: {
            members: true,
            projects: true,
            products: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Transform to include user's role
    const orgsWithRole = organizations.map(org => ({
      ...org,
      userRole: org.members[0]?.role || null,
      members: undefined // Remove members array from response
    }))

    return successResponse(orgsWithRole)
  } catch (error) {
    return handleApiError(error, 'GET /api/organizations')
  }
}

// POST /api/organizations - Create organization
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createOrganizationSchema.parse(body)

    // Check if slug is already taken
    const existingOrg = await prisma.organization.findUnique({
      where: { slug: validatedData.slug }
    })

    if (existingOrg) {
      return NextResponse.json(
        { error: 'An organization with this slug already exists' },
        { status: 400 }
      )
    }

    // Create organization with the user as owner
    const organization = await prisma.organization.create({
      data: {
        name: validatedData.name,
        slug: validatedData.slug,
        members: {
          create: {
            userId: session.user.id,
            role: 'OWNER'
          }
        }
      },
      include: {
        members: {
          where: {
            userId: session.user.id
          },
          select: {
            role: true
          }
        },
        _count: {
          select: {
            members: true,
            projects: true,
            products: true
          }
        }
      }
    })

    return successResponse({
      ...organization,
      userRole: organization.members[0]?.role || null,
      members: undefined
    })
  } catch (error) {
    return handleApiError(error, 'POST /api/organizations')
  }
}