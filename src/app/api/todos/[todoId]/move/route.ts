import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { moveTaskToProject } from '@/lib/services/todo.service'
import { z } from 'zod'

const moveTaskSchema = z.object({
  projectId: z.string().nullable(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ todoId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { todoId } = await params
    const body = await request.json()
    const { projectId } = moveTaskSchema.parse(body)

    const todo = await moveTaskToProject(todoId, projectId, session.user.id)
    return NextResponse.json(todo)
  } catch (error) {
    console.error('Error moving task:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.errors }, { status: 400 })
    }
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    return NextResponse.json({ error: 'Failed to move task' }, { status: 500 })
  }
}