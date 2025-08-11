import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { requireAuth } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

// GET /api/user/todos/[todoId]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ todoId: string }> }
) {
  try {
    const user = await requireAuth()
    const userId = user.id
    const { todoId } = await params

    const todo = await prisma.todo.findFirst({
      where: {
        id: todoId,
        creatorId: userId
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        assignee: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        project: {
          select: {
            id: true,
            name: true
          }
        },
        comments: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    })

    if (!todo) {
      return NextResponse.json(
        { error: 'Todo not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(todo)
  } catch (error) {
    console.error('Error fetching todo:', error)
    return NextResponse.json(
      { error: 'Failed to fetch todo' },
      { status: 500 }
    )
  }
}

// PATCH /api/user/todos/[todoId]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ todoId: string }> }
) {
  try {
    const user = await requireAuth()
    const userId = user.id
    const { todoId } = await params
    const body = await request.json()

    // First check if the todo exists and belongs to the user
    const existingTodo = await prisma.todo.findFirst({
      where: {
        id: todoId,
        creatorId: userId
      }
    })

    if (!existingTodo) {
      return NextResponse.json(
        { error: 'Todo not found' },
        { status: 404 }
      )
    }

    // Update the todo
    const updatedTodo = await prisma.todo.update({
      where: {
        id: todoId
      },
      data: {
        title: body.title,
        description: body.description,
        status: body.status,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        projectId: body.projectId,
        assigneeId: body.assigneeId
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        assignee: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        project: {
          select: {
            id: true,
            name: true
          }
        },
        comments: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    })

    return NextResponse.json(updatedTodo)
  } catch (error) {
    console.error('Error updating todo:', error)
    return NextResponse.json(
      { error: 'Failed to update todo' },
      { status: 500 }
    )
  }
}

// DELETE /api/user/todos/[todoId]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ todoId: string }> }
) {
  try {
    const user = await requireAuth()
    const userId = user.id
    const { todoId } = await params

    // First check if the todo exists and belongs to the user
    const existingTodo = await prisma.todo.findFirst({
      where: {
        id: todoId,
        creatorId: userId
      }
    })

    if (!existingTodo) {
      return NextResponse.json(
        { error: 'Todo not found' },
        { status: 404 }
      )
    }

    // Delete the todo (this will cascade delete comments due to the schema)
    await prisma.todo.delete({
      where: {
        id: todoId
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting todo:', error)
    return NextResponse.json(
      { error: 'Failed to delete todo' },
      { status: 500 }
    )
  }
}