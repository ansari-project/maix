import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { updateTodoSchema } from '@/lib/validations/todo'
import { canUpdateTodo, canDeleteTodo, isValidAssignee } from '@/lib/permissions/todo-permissions'
import { TodoStatus } from '@prisma/client'

export async function GET(req: NextRequest, { params }: { params: Promise<{ todoId: string }> }) {
  try {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { todoId } = await params
  
  const todo = await prisma.todo.findUnique({
    where: { id: todoId },
    include: {
      creator: {
        select: {
          id: true,
          name: true,
          username: true,
          image: true
        }
      },
      assignee: {
        select: {
          id: true,
          name: true,
          username: true,
          image: true
        }
      },
      project: {
        select: {
          id: true,
          name: true,
          goal: true
        }
      },
      posts: {
        select: {
          id: true,
          type: true,
          content: true,
          createdAt: true,
          updatedAt: true,
          author: {
            select: {
              id: true,
              name: true,
              username: true,
              image: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }
    }
  })

  if (!todo) {
    return NextResponse.json({ error: 'Todo not found' }, { status: 404 })
  }

  return NextResponse.json({ todo })
  } catch (error) {
    logger.error('Failed to fetch todo', error as Error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ todoId: string }> }) {
  try {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { todoId } = await params
  
  // Check if user can update this todo
  const canUpdate = await canUpdateTodo(session.user.id, todoId)
  if (!canUpdate) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Get the todo to check project
  const existingTodo = await prisma.todo.findUnique({
    where: { id: todoId },
    select: { projectId: true }
  })

  if (!existingTodo) {
    return NextResponse.json({ error: 'Todo not found' }, { status: 404 })
  }

  // Validate request body
  const body = await req.json()
  const validatedData = updateTodoSchema.parse(body)

  // If assigneeId is being updated, validate they are a project participant
  if (validatedData.assigneeId !== undefined && validatedData.assigneeId !== null && existingTodo.projectId) {
    const isValid = await isValidAssignee(validatedData.assigneeId, existingTodo.projectId)
    if (!isValid) {
      return NextResponse.json(
        { error: 'Assignee must be a project participant' },
        { status: 400 }
      )
    }
  }

  // Prepare update data
  const updateData: any = {}
  if (validatedData.title !== undefined) updateData.title = validatedData.title
  if (validatedData.description !== undefined) updateData.description = validatedData.description
  if (validatedData.status !== undefined) updateData.status = validatedData.status as TodoStatus
  if (validatedData.assigneeId !== undefined) updateData.assigneeId = validatedData.assigneeId
  if (validatedData.dueDate !== undefined) {
    updateData.dueDate = validatedData.dueDate ? new Date(validatedData.dueDate) : null
  }

  // Update the todo
  const todo = await prisma.todo.update({
    where: { id: todoId },
    data: updateData,
    include: {
      creator: {
        select: {
          id: true,
          name: true,
          username: true,
          image: true
        }
      },
      assignee: {
        select: {
          id: true,
          name: true,
          username: true,
          image: true
        }
      },
      project: {
        select: {
          id: true,
          name: true
        }
      }
    }
  })

  return NextResponse.json({ todo })
  } catch (error) {
    logger.error('Failed to update todo', error as Error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ todoId: string }> }) {
  try {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { todoId } = await params
  
  // Check if user can delete this todo
  const canDelete = await canDeleteTodo(session.user.id, todoId)
  if (!canDelete) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Delete the todo (posts will have todoId set to null due to SetNull cascade)
  await prisma.todo.delete({
    where: { id: todoId }
  })

  return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Failed to delete todo', error as Error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}