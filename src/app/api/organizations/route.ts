import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createOrganizationSchema } from '@/lib/validations/organization'
import { apiHandler } from '@/lib/api/api-handler'
import { withAuth, type AuthenticatedRequest } from '@/lib/api/with-auth'
import { logger } from '@/lib/logger'

// GET /api/organizations - List user's organizations
const handleGet = withAuth(async (request: AuthenticatedRequest) => {
  const organizations = await prisma.organization.findMany({
    where: {
      members: {
        some: {
          userId: request.user.id
        }
      }
    },
    include: {
      members: {
        where: {
          userId: request.user.id
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

  logger.apiResponse('GET', '/api/organizations', 200, 0)
  return NextResponse.json(orgsWithRole)
})

// POST /api/organizations - Create organization
const handlePost = withAuth(async (request: AuthenticatedRequest) => {
  const body = await request.json()
  const validatedData = createOrganizationSchema.parse(body)

  // Check if slug is already taken
  const existingOrg = await prisma.organization.findUnique({
    where: { slug: validatedData.slug }
  })

  if (existingOrg) {
    logger.warn('Organization slug already exists', {
      slug: validatedData.slug,
      userId: request.user.id
    })
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
          userId: request.user.id,
          role: 'OWNER'
        }
      }
    },
    include: {
      members: {
        where: {
          userId: request.user.id
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

  logger.info('Organization created', {
    organizationId: organization.id,
    slug: organization.slug,
    userId: request.user.id
  })

  return NextResponse.json({
    ...organization,
    userRole: organization.members[0]?.role || null,
    members: undefined
  }, { status: 201 })
})

export const GET = apiHandler({ GET: handleGet })
export const POST = apiHandler({ POST: handlePost })