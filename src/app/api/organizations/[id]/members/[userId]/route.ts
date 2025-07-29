import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleApiError, successResponse } from '@/lib/api-utils'

// DELETE /api/organizations/[id]/members/[userId] - Remove member (OWNER only)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const { id, userId } = await params
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if requester is an owner
    const requesterMember = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: id,
          userId: session.user.id
        }
      }
    })

    if (requesterMember?.role !== 'OWNER') {
      return NextResponse.json({ error: 'Only organization owners can remove members' }, { status: 403 })
    }

    // Check if member to remove exists
    const memberToRemove = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: id,
          userId
        }
      }
    })

    if (!memberToRemove) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    // Prevent removing the last owner
    if (memberToRemove.role === 'OWNER') {
      const ownerCount = await prisma.organizationMember.count({
        where: {
          organizationId: id,
          role: 'OWNER'
        }
      })

      if (ownerCount <= 1) {
        return NextResponse.json(
          { error: 'Cannot remove the last owner. Transfer ownership first.' },
          { status: 400 }
        )
      }
    }

    // Remove member
    await prisma.organizationMember.delete({
      where: {
        organizationId_userId: {
          organizationId: id,
          userId
        }
      }
    })

    return successResponse({ message: 'Member removed successfully' })
  } catch (error) {
    return handleApiError(error, 'DELETE /api/organizations/[id]/members/[userId]')
  }
}