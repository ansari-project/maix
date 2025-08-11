import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { TodoStatus } from "@prisma/client"
import { z } from "zod"

const createTodoSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional().default(""),
  status: z.enum(["NOT_STARTED", "IN_PROGRESS", "WAITING_FOR", "COMPLETED"]).default("NOT_STARTED"),
  startDate: z.string().optional(),
  dueDate: z.string().optional(),
  projectId: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get("status") as TodoStatus | null
    const projectId = searchParams.get("projectId")
    const sortBy = searchParams.get("sortBy") || "createdAt"
    const sortOrder = searchParams.get("sortOrder") || "desc"
    const limitParam = searchParams.get("limit")
    const limit = limitParam ? parseInt(limitParam, 10) : undefined

    // Build where clause
    const where: any = {
      assigneeId: session.user.id,
    }

    if (status) {
      where.status = status
    }

    if (projectId) {
      where.projectId = projectId
    }

    // Fetch todos with related data
    const todos = await prisma.todo.findMany({
      where,
      include: {
        project: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        posts: {
          select: {
            id: true,
          },
        },
      },
      orderBy: {
        [sortBy]: sortOrder,
      },
      ...(limit && { take: limit }),
    })

    // Get unique projects for filtering
    const projects = await prisma.project.findMany({
      where: {
        todos: {
          some: {
            assigneeId: session.user.id,
          },
        },
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: "asc",
      },
    })

    // Count todos by status
    const statusCounts = await prisma.todo.groupBy({
      by: ["status"],
      where: {
        assigneeId: session.user.id,
      },
      _count: true,
    })

    const counts: Record<string, number> = {
      total: todos.length,
      NOT_STARTED: 0,
      OPEN: 0,
      IN_PROGRESS: 0,
      WAITING_FOR: 0,
      COMPLETED: 0,
      DONE: 0,
    }

    statusCounts.forEach((count) => {
      counts[count.status] = count._count
    })

    return NextResponse.json({
      todos,
      projects,
      counts,
    })
  } catch (error) {
    console.error("Error in GET /api/user/todos:", error)
    return NextResponse.json(
      { error: "Failed to fetch todos" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createTodoSchema.parse(body)

    // Create the todo
    const todo = await prisma.todo.create({
      data: {
        title: validatedData.title,
        description: validatedData.description,
        status: validatedData.status,
        startDate: validatedData.startDate ? new Date(validatedData.startDate) : new Date(),
        dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : null,
        projectId: validatedData.projectId || null,
        creatorId: session.user.id,
        assigneeId: session.user.id,
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    return NextResponse.json(todo, { status: 201 })
  } catch (error) {
    console.error("Error in POST /api/user/todos:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Failed to create todo" },
      { status: 500 }
    )
  }
}