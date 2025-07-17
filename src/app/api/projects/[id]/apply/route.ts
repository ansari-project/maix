import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const project = await prisma.project.findUnique({
      where: { id: params.id },
      include: {
        applications: true
      }
    })

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    // Check if user already applied
    const existingApplication = await prisma.application.findUnique({
      where: {
        userId_projectId: {
          userId: user.id,
          projectId: params.id
        }
      }
    })

    if (existingApplication) {
      return NextResponse.json({ error: "You have already applied to this project" }, { status: 400 })
    }

    // Check if project is full
    if (project.applications.length >= project.maxVolunteers) {
      return NextResponse.json({ error: "This project has reached its volunteer limit" }, { status: 400 })
    }

    const data = await request.json()
    const { message } = data

    const application = await prisma.application.create({
      data: {
        message,
        userId: user.id,
        projectId: params.id
      },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        },
        project: {
          select: {
            title: true
          }
        }
      }
    })

    return NextResponse.json(application, { status: 201 })
  } catch (error) {
    console.error("Application creation error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}