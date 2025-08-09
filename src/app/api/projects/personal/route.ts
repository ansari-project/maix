import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { 
  createPersonalProject, 
  getPersonalProjects,
  createPersonalProjectSchema 
} from '@/lib/services/project.service'
import { z } from 'zod'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const includeShared = searchParams.get('includeShared') === 'true'
    const category = searchParams.get('category') || undefined

    const projects = await getPersonalProjects(session.user.id, {
      includeShared: includeShared || undefined,
      category: category,
    })
    return NextResponse.json(projects)
  } catch (error) {
    console.error('Error fetching personal projects:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid parameters', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validated = createPersonalProjectSchema.parse(body)

    const project = await createPersonalProject(session.user.id, validated)
    return NextResponse.json(project, { status: 201 })
  } catch (error) {
    console.error('Error creating personal project:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 })
  }
}