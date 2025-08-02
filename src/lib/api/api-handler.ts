import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

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
      // Use structured logging
      logger.error('API handler error', error, {
        method,
        url: request.url,
        context: 'apiHandler'
      })

      // Return generic error to avoid leaking internal details
      return NextResponse.json(
        { message: 'Internal server error' },
        { status: 500 }
      )
    }
  }
}