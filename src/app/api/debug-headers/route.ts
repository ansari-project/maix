import { NextRequest, NextResponse } from 'next/server'

/**
 * Minimal endpoint to test Authorization header transmission
 * This will help us determine if the MCP client is sending the header correctly
 */
export async function GET(request: NextRequest) {
  console.log('🔍 DEBUG-HEADERS: Incoming request')
  
  // Log ALL headers received
  const headers = Object.fromEntries(request.headers.entries())
  console.log('🔍 DEBUG-HEADERS: All headers received:', JSON.stringify(headers, null, 2))
  
  // Specifically check for Authorization variants
  const authVariants = {
    'authorization': request.headers.get('authorization'),
    'Authorization': request.headers.get('Authorization'),
    'x-authorization': request.headers.get('x-authorization'),
    'x-forwarded-authorization': request.headers.get('x-forwarded-authorization'),
  }
  console.log('🔍 DEBUG-HEADERS: Authorization variants:', authVariants)
  
  return NextResponse.json({
    message: 'Debug Headers Endpoint',
    timestamp: new Date().toISOString(),
    method: request.method,
    url: request.url,
    allHeaders: headers,
    authVariants,
    hasAuth: !!request.headers.get('authorization'),
    authHeaderValue: request.headers.get('authorization') ? 
      request.headers.get('authorization')?.substring(0, 20) + '...' : 
      'NOT FOUND'
  })
}

export async function POST(request: NextRequest) {
  return GET(request) // Same logic for POST
}