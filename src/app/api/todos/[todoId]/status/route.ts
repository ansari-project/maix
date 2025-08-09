import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { updateTodoStatus } from '@/lib/services/todo.service'
import { TodoStatus } from '@prisma/client'
import { z } from 'zod'

const statusUpdateSchema = z.object({
  status: z.nativeEnum(TodoStatus),
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
    const { status } = statusUpdateSchema.parse(body)

    const todo = await updateTodoStatus(todoId, status, session.user.id)
    return NextResponse.json(todo)
  } catch (error) {
    console.error('Error updating todo status:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid status', details: error.errors }, { status: 400 })
    }
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 })
  }
}