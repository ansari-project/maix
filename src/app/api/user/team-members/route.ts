import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Find all unique users who are members of the same projects as the current user
    const projects = await prisma.project.findMany({
      where: {
        OR: [
          { ownerId: session.user.id },
          { members: { some: { userId: session.user.id } } }
        ]
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      }
    })

    // Collect all unique users
    const usersMap = new Map<string, { id: string; name: string | null; email: string }>()
    
    // Add current user
    usersMap.set(session.user.id, {
      id: session.user.id,
      name: session.user.name || null,
      email: session.user.email || ''
    })

    // Add project owners and members
    projects.forEach(project => {
      // Add owner
      if (project.owner) {
        usersMap.set(project.owner.id, project.owner)
      }
      
      // Add members
      project.members.forEach(member => {
        if (member.user) {
          usersMap.set(member.user.id, member.user)
        }
      })
    })

    const users = Array.from(usersMap.values()).sort((a, b) => {
      const nameA = a.name || a.email
      const nameB = b.name || b.email
      return nameA.localeCompare(nameB)
    })

    return NextResponse.json({ users })
  } catch (error) {
    console.error("Error fetching team members:", error)
    return NextResponse.json(
      { error: "Failed to fetch team members" },
      { status: 500 }
    )
  }
}