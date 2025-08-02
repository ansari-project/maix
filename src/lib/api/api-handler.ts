import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { Prisma } from '@prisma/client'
import { ZodError } from 'zod'

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
type Handler = (request: Request) => Promise<Response> | Response
type Handlers = Partial<Record<HttpMethod, Handler>>

export function apiHandler(handlers: Handlers) {
  return async (request: Request) => {
    const method = request.method as HttpMethod
    const handler = handlers[method]

    if (!handler) {
      const allowedMethods = Object.keys(handlers).join(', ')
      return NextResponse.json(
        { error: `Method ${method} Not Allowed. Allowed methods: ${allowedMethods}` },
        { 
          status: 405,
          headers: { 'Allow': allowedMethods }
        }
      )
    }

    try {
      return await handler(request)
    } catch (error) {
      // Handle different types of errors appropriately
      if (error instanceof ZodError) {
        logger.warn('Validation error', {
          method,
          url: request.url,
          context: 'apiHandler',
          validationErrors: error.errors
        })
        
        return NextResponse.json(
          { 
            error: 'Validation failed',
            details: error.errors.map(err => ({
              field: err.path.join('.'),
              message: err.message
            }))
          },
          { status: 400 }
        )
      }

      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        logger.error('Prisma error', error, {
          method,
          url: request.url,
          context: 'apiHandler',
          prismaErrorCode: error.code,
          prismaErrorMeta: error.meta
        })

        // Handle common Prisma errors with user-friendly messages
        switch (error.code) {
          case 'P2002':
            return NextResponse.json(
              { error: 'A record with this data already exists' },
              { status: 409 }
            )
          case 'P2025':
            return NextResponse.json(
              { error: 'Record not found' },
              { status: 404 }
            )
          case 'P2003':
            return NextResponse.json(
              { error: 'Invalid reference to related record' },
              { status: 400 }
            )
          case 'P2016':
            return NextResponse.json(
              { error: 'Query interpretation error' },
              { status: 400 }
            )
          default:
            return NextResponse.json(
              { error: 'Database operation failed' },
              { status: 500 }
            )
        }
      }

      if (error instanceof Prisma.PrismaClientUnknownRequestError) {
        logger.error('Unknown Prisma error', error, {
          method,
          url: request.url,
          context: 'apiHandler'
        })
        
        return NextResponse.json(
          { error: 'Database error occurred' },
          { status: 500 }
        )
      }

      if (error instanceof Prisma.PrismaClientValidationError) {
        logger.error('Prisma validation error', error, {
          method,
          url: request.url,
          context: 'apiHandler'
        })
        
        return NextResponse.json(
          { error: 'Invalid database query' },
          { status: 400 }
        )
      }

      // Handle custom application errors
      if (error instanceof Error && error.name === 'ValidationError') {
        logger.warn('Application validation error', {
          method,
          url: request.url,
          context: 'apiHandler',
          message: error.message
        })
        
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        )
      }

      // Generic error handling
      logger.error('API handler error', error, {
        method,
        url: request.url,
        context: 'apiHandler'
      })

      // Return generic error to avoid leaking internal details
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
}