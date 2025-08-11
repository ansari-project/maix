import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { logger } from '@/lib/logger'

export async function middleware(request: NextRequest) {
  const start = Date.now()
  
  // DEBUG: Log incoming headers
  console.log('🔍 MIDDLEWARE: Incoming headers:', JSON.stringify(Object.fromEntries(request.headers.entries()), null, 2))
  
  // Create request ID for tracing
  const requestId = crypto.randomUUID()
  
  // Clone the request headers to add request ID
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-request-id', requestId)
  
  // Request ID will be available in response headers for tracing
  console.log('🔍 MIDDLEWARE: Request ID assigned:', requestId)
  
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
  
  // FIXED: Don't modify request headers, just pass through
  // The header manipulation was stripping Authorization/Accept headers on Vercel Edge
  const response = NextResponse.next()
  
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