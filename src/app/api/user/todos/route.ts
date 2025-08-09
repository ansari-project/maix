import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { TodoStatus } from "@prisma/client"

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