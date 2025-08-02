import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { logger } from '@/lib/logger'

export async function middleware(request: NextRequest) {
  const start = Date.now()
  
  // Create request ID for tracing
  const requestId = crypto.randomUUID()
  
  // Clone the request headers to add request ID
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-request-id', requestId)
  
  // Log the incoming request (be careful not to log sensitive headers)
  logger.info('Incoming request', {
    requestId,
    method: request.method,
    path: request.nextUrl.pathname,
    // Only log safe headers
    userAgent: request.headers.get('user-agent'),
    referer: request.headers.get('referer'),
    // Be careful with IP - might be PII in some jurisdictions
    // ip: process.env.LOG_IP === 'true' ? request.ip : undefined, // NextRequest doesn't have ip property
  })
  
  // Create response with modified headers
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
  
  // Add request ID to response headers for client correlation
  response.headers.set('x-request-id', requestId)
  
  // Log response time
  const duration = Date.now() - start
  logger.info('Request completed', {
    requestId,
    method: request.method,
    path: request.nextUrl.pathname,
    duration,
  })
  
  return response
}

// Configure which paths the middleware runs on
export const config = {
  matcher: [
    // Match all request paths except static files and images
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}