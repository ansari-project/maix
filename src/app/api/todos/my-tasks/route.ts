import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getMyTasks, getMyTasksGrouped } from '@/lib/services/todo.service'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse query params
    const searchParams = request.nextUrl.searchParams
    
    // Handle boolean params safely
    const includeCompleted = searchParams.get('includeCompleted') === 'true'
    const grouped = searchParams.get('grouped') === 'true'
    const projectId = searchParams.get('projectId') || undefined

    // Get tasks based on grouped parameter
    if (grouped) {
      const tasks = await getMyTasksGrouped(session.user.id, {
        includeCompleted: includeCompleted,
      })
      return NextResponse.json(tasks)
    } else {
      const tasks = await getMyTasks(session.user.id, {
        includeCompleted: includeCompleted,
        projectId: projectId,
      })
      return NextResponse.json(tasks)
    }
  } catch (error) {
    console.error('Error fetching my tasks:', error)
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 })
  }
}