import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { signupSchema } from "@/lib/validations"
import bcrypt from "bcryptjs"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    // Validate input with Zod
    const validation = signupSchema.safeParse(body)
    
    if (!validation.success) {
      // Extract password-specific errors for clearer messaging
      const passwordErrors = validation.error.errors
        .filter(err => err.path.includes('password'))
        .map(err => err.message)
      
      const mainMessage = passwordErrors.length > 0 
        ? 'Password requirements not met'
        : 'Invalid input'
      
      return NextResponse.json(
        { 
          message: mainMessage,
          errors: validation.error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        },
        { status: 400 }
      )
    }

    const { name, username, email, password } = validation.data

    // Check if user already exists
    const [existingUserByEmail, existingUserByUsername] = await Promise.all([
      prisma.user.findUnique({ where: { email } }),
      prisma.user.findUnique({ where: { username } })
    ])

    if (existingUserByEmail) {
      return NextResponse.json(
        { message: "User with this email already exists" },
        { status: 400 }
      )
    }

    if (existingUserByUsername) {
      return NextResponse.json(
        { message: "Username is already taken" },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 8)

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        username,
        email,
        password: hashedPassword,
      }
    })

    return NextResponse.json(
      { message: "User created successfully", userId: user.id },
      { status: 201 }
    )
  } catch (error) {
    console.error("Signup error:", error)
    // Add more detailed error logging
    if (error instanceof Error) {
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        name: error.name
      })
    }
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}