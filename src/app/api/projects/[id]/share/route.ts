import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { sharePersonalProject, unsharePersonalProject } from '@/lib/services/project.service'
import { z } from 'zod'

const shareSchema = z.object({
  userId: z.string(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { userId } = shareSchema.parse(body)

    const project = await sharePersonalProject(id, session.user.id, userId)
    return NextResponse.json(project)
  } catch (error) {
    console.error('Error sharing project:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.errors }, { status: 400 })
    }
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json({ error: error.message }, { status: 404 })
      }
      if (error.message.includes('Only the owner')) {
        return NextResponse.json({ error: error.message }, { status: 403 })
      }
      if (error.message.includes('already shared')) {
        return NextResponse.json({ error: error.message }, { status: 409 })
      }
    }
    return NextResponse.json({ error: 'Failed to share project' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')
    
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    const project = await unsharePersonalProject(id, session.user.id, userId)
    return NextResponse.json(project)
  } catch (error) {
    console.error('Error unsharing project:', error)
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json({ error: error.message }, { status: 404 })
      }
      if (error.message.includes('Only the owner')) {
        return NextResponse.json({ error: error.message }, { status: 403 })
      }
    }
    return NextResponse.json({ error: 'Failed to unshare project' }, { status: 500 })
  }
}