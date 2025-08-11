import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { inviteMemberSchema } from '@/lib/validations/organization'
import { handleApiError, successResponse } from '@/lib/api-utils'
import { OrgRole } from '@prisma/client'

// Helper to check if user is an organization owner
async function isOrgOwner(userId: string, organizationId: string) {
  const member = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId,
        userId
      }
    }
  })
  return member?.role === 'OWNER'
}

// GET /api/organizations/[id]/members - List organization members
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
    const isMember = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: id,
          userId: session.user.id
        }
      }
    })

    if (!isMember) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const members = await prisma.organizationMember.findMany({
      where: { organizationId: id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            skills: true,
            bio: true
          }
        }
      },
      orderBy: [
        { role: 'asc' }, // Owners first
        { joinedAt: 'asc' }
      ]
    })

    return successResponse(members)
  } catch (error) {
    return handleApiError(error, 'GET /api/organizations/[id]/members')
  }
}

// POST /api/organizations/[id]/members - Invite member (OWNER only)
export async function POST(
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
    if (!(await isOrgOwner(session.user.id, id))) {
      return NextResponse.json({ error: 'Only organization owners can invite members' }, { status: 403 })
    }

    const body = await request.json()
    const { userId } = inviteMemberSchema.parse(body)

    // Check if user exists
    const userToInvite = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true }
    })

    if (!userToInvite) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user is already a member
    const existingMember = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: id,
          userId
        }
      }
    })

    if (existingMember) {
      return NextResponse.json({ error: 'User is already a member' }, { status: 400 })
    }

    // Add member
    const member = await prisma.organizationMember.create({
      data: {
        organizationId: id,
        userId,
        role: 'MEMBER' as OrgRole
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            skills: true,
            bio: true
          }
        }
      }
    })

    return successResponse(member)
  } catch (error) {
    return handleApiError(error, 'POST /api/organizations/[id]/members')
  }
}