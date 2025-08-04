import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { createTodoSchema, todoQuerySchema } from '@/lib/validations/todo'
import { canManageTodos, isValidAssignee } from '@/lib/permissions/todo-permissions'
import { TodoStatus } from '@prisma/client'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: projectId } = await params
  
  // Parse query parameters
  const searchParams = req.nextUrl.searchParams
  const queryParams = todoQuerySchema.parse({
    status: searchParams.get('status'),
    assigneeId: searchParams.get('assigneeId'),
    limit: searchParams.get('limit'),
    offset: searchParams.get('offset')
  })

  // Build where clause
  const where: any = { projectId }
  if (queryParams.status) {
    where.status = queryParams.status as TodoStatus
  }
  if (queryParams.assigneeId) {
    where.assigneeId = queryParams.assigneeId
  }

  // Fetch todos with pagination
  const [todos, total] = await Promise.all([
    prisma.todo.findMany({
      where,
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
        posts: {
          select: {
            id: true,
            type: true,
            content: true,
            createdAt: true,
            author: {
              select: {
                id: true,
                name: true,
                username: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 3 // Limit posts per todo for performance
        }
      },
      orderBy: [
        { status: 'asc' }, // Open first, then in progress, then completed
        { dueDate: 'asc' }, // Due soon first (nulls last)
        { createdAt: 'desc' } // Newest first
      ],
      take: queryParams.limit,
      skip: queryParams.offset
    }),
    prisma.todo.count({ where })
  ])

  return NextResponse.json({
    todos,
    pagination: {
      total,
      limit: queryParams.limit,
      offset: queryParams.offset
    }
  })
  } catch (error) {
    logger.error('Failed to fetch todos', error as Error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: projectId } = await params
  
  // Check if user can manage todos in this project
  const canManage = await canManageTodos(session.user.id, projectId)
  if (!canManage) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Validate request body
  const body = await req.json()
  const validatedData = createTodoSchema.parse(body)

  // If assigneeId provided, validate they are a project participant
  if (validatedData.assigneeId) {
    const isValid = await isValidAssignee(validatedData.assigneeId, projectId)
    if (!isValid) {
      return NextResponse.json(
        { error: 'Assignee must be a project participant' },
        { status: 400 }
      )
    }
  }

  // Create the todo
  const todo = await prisma.todo.create({
    data: {
      title: validatedData.title,
      description: validatedData.description,
      dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : null,
      projectId,
      creatorId: session.user.id,
      assigneeId: validatedData.assigneeId
    },
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

  return NextResponse.json({ todo }, { status: 201 })
  } catch (error) {
    logger.error('Failed to create todo', error as Error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}