import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { updateOrganizationSchema } from '@/lib/validations/organization'
import { handleApiError, successResponse } from '@/lib/api-utils'

// Helper to check if user is an organization member
async function getUserOrgRole(userId: string, organizationId: string) {
  const member = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId,
        userId
      }
    }
  })
  return member?.role || null
}

// GET /api/organizations/[id] - Get organization details
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is a member
    const userRole = await getUserOrgRole(session.user.id, id)
    if (!userRole) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const organization = await prisma.organization.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true
              }
            }
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

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    return successResponse({
      ...organization,
      userRole
    })
  } catch (error) {
    return handleApiError(error, 'GET /api/organizations/[id]')
  }
}

// PUT /api/organizations/[id] - Update organization (OWNER only)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is an owner
    const userRole = await getUserOrgRole(session.user.id, id)
    if (userRole !== 'OWNER') {
      return NextResponse.json({ error: 'Only organization owners can update settings' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = updateOrganizationSchema.parse(body)

    // Transform empty strings to null for optional fields
    const updateData: any = {}
    if ('name' in validatedData) updateData.name = validatedData.name
    if ('mission' in validatedData) updateData.mission = validatedData.mission || null
    if ('description' in validatedData) updateData.description = validatedData.description || null
    if ('url' in validatedData) updateData.url = validatedData.url || null
    if ('aiEngagement' in validatedData) updateData.aiEngagement = validatedData.aiEngagement || null

    const organization = await prisma.organization.update({
      where: { id },
      data: updateData,
      include: {
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
      userRole
    })
  } catch (error) {
    return handleApiError(error, 'PUT /api/organizations/[id]')
  }
}

// DELETE /api/organizations/[id] - Delete organization (OWNER only)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is an owner
    const userRole = await getUserOrgRole(session.user.id, id)
    if (userRole !== 'OWNER') {
      return NextResponse.json({ error: 'Only organization owners can delete the organization' }, { status: 403 })
    }

    // Check if organization has any projects or products
    const projectCount = await prisma.project.count({ where: { organizationId: id } })
    const productCount = await prisma.product.count({ where: { organizationId: id } })

    if (projectCount > 0 || productCount > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot delete organization. Please transfer or delete all projects and products first.',
          details: { projectCount, productCount }
        },
        { status: 400 }
      )
    }

    // Delete organization (members will cascade delete)
    await prisma.organization.delete({
      where: { id }
    })

    return successResponse({ message: 'Organization deleted successfully' })
  } catch (error) {
    return handleApiError(error, 'DELETE /api/organizations/[id]')
  }
}