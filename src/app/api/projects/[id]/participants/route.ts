import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: projectId } = await params
    
    // Fetch project with owner and accepted volunteers
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            username: true,
            image: true
          }
        },
        applications: {
          where: { status: 'ACCEPTED' },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                username: true,
                image: true
              }
            }
          }
        }
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Combine owner and accepted volunteers
    const participants = [
      {
        ...project.owner,
        role: 'OWNER' as const
      },
      ...project.applications.map(app => ({
        ...app.user,
        role: 'VOLUNTEER' as const
      }))
    ]

    return NextResponse.json({ participants })
  } catch (error) {
    logger.error('Failed to fetch participants', error as Error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}