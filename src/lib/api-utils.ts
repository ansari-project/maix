import { NextResponse } from "next/server"
import { z } from "zod"
import { logger } from "./logger"
import { Prisma } from "@prisma/client"
import { AuthError, AuthorizationError, ValidationError } from "./errors"

export function handleApiError(error: unknown, context?: string) {
  // Log first, so we always have a record
  const operation = context || "API operation"
  
  if (error instanceof Error) {
    logger.error(`${operation} failed`, error, { context })
  } else {
    logger.error(`${operation} failed`, undefined, { context, error })
  }

  // Handle custom auth errors
  if (error instanceof AuthError) {
    return NextResponse.json({ message: error.message }, { status: 401 })
  }

  // Handle authorization errors
  if (error instanceof AuthorizationError) {
    return NextResponse.json({ message: error.message }, { status: 403 })
  }

  // Handle validation errors
  if (error instanceof ValidationError) {
    return NextResponse.json({ message: error.message }, { status: 400 })
  }

  // Handle Zod validation errors
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      { message: "Invalid input", errors: error.errors },
      { status: 400 }
    )
  }

  // Handle Prisma known request errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        // Unique constraint violation
        return NextResponse.json(
          { message: 'This resource already exists.' },
          { status: 409 } // Conflict
        )
      case 'P2003':
        // Foreign key constraint violation
        return NextResponse.json(
          { message: 'Operation failed due to a related data constraint.' },
          { status: 409 } // Conflict
        )
      case 'P2025':
        // Record to update/delete not found
        return NextResponse.json(
          { message: 'The resource to modify was not found.' },
          { status: 404 } // Not Found
        )
      // Add other specific Prisma error codes here as needed
    }
  }

  // Default error response
  return NextResponse.json(
    { message: "Internal server error" },
    { status: 500 }
  )
}

export async function parseRequestBody<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<T> {
  const body = await request.json()
  // Let it throw ZodError on failure, which handleApiError will catch
  return schema.parse(body)
}

export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json(data, { status })
}

export function errorResponse(message: string, status = 400) {
  return NextResponse.json({ message }, { status })
}