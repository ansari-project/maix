import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleApiError, successResponse } from '@/lib/api-utils'

// POST /api/organizations/[id]/leave - Leave organization
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

    // Use transaction to prevent race conditions
    await prisma.$transaction(async (tx) => {
      // Check if user is a member
      const member = await tx.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId: id,
            userId: session.user.id
          }
        }
      })

      if (!member) {
        throw new Error('You are not a member of this organization')
      }

      // Prevent the last owner from leaving
      if (member.role === 'OWNER') {
        const ownerCount = await tx.organizationMember.count({
          where: {
            organizationId: id,
            role: 'OWNER'
          }
        })

        if (ownerCount <= 1) {
          throw new Error('Cannot leave as the last owner. Transfer ownership or delete the organization first.')
        }
      }

      // Remove member
      await tx.organizationMember.delete({
        where: {
          organizationId_userId: {
            organizationId: id,
            userId: session.user.id
          }
        }
      })
    })

    return successResponse({ message: 'Successfully left the organization' })
  } catch (error) {
    return handleApiError(error, 'POST /api/organizations/[id]/leave')
  }
}