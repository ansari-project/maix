import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createStandaloneTask, createTodoSchema } from '@/lib/services/todo.service'
import { z } from 'zod'

const standaloneTaskSchema = createTodoSchema.omit({ projectId: true, eventId: true })

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validated = standaloneTaskSchema.parse(body)

    const task = await createStandaloneTask(session.user.id, validated)
    return NextResponse.json(task, { status: 201 })
  } catch (error) {
    console.error('Error creating standalone task:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 })
  }
}