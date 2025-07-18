import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { projectCreateSchema } from "@/lib/validations"

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const projects = await prisma.project.findMany({
      where: {
        isActive: true
      },
      include: {
        owner: {
          select: {
            name: true,
            email: true
          }
        },
        product: {
          select: {
            id: true,
            name: true,
            url: true
          }
        },
        _count: {
          select: {
            applications: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 50 // Add pagination limit
    })

    return NextResponse.json(projects)
  } catch (error) {
    console.error("Projects fetch error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
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

    const body = await request.json()
    
    // Validate input with Zod
    const validation = projectCreateSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { 
          message: "Invalid input", 
          errors: validation.error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        },
        { status: 400 }
      )
    }

    const validatedData = validation.data

    // If productId is provided, validate user owns the product
    if (validatedData.productId) {
      const product = await prisma.product.findUnique({
        where: { id: validatedData.productId }
      })

      if (!product) {
        return NextResponse.json(
          { error: "Product not found" },
          { status: 404 }
        )
      }

      if (product.ownerId !== user.id) {
        return NextResponse.json(
          { error: "You can only associate projects with your own products" },
          { status: 403 }
        )
      }
    }

    const project = await prisma.project.create({
      data: {
        ...validatedData,
        // Convert empty string to null for optional URL field
        organizationUrl: validatedData.organizationUrl === '' ? null : validatedData.organizationUrl,
        // Convert undefined timeline to empty object for JSON field
        timeline: validatedData.timeline || {},
        // Convert undefined requiredSkills to empty array for JSON field
        requiredSkills: validatedData.requiredSkills || [],
        ownerId: user.id
      },
      include: {
        owner: {
          select: {
            name: true,
            email: true
          }
        },
        product: {
          select: {
            id: true,
            name: true,
            url: true
          }
        }
      }
    })

    return NextResponse.json(project, { status: 201 })
  } catch (error) {
    console.error("Project creation error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}