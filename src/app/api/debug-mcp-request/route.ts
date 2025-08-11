import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Debug MCP Request Handler',
    method: 'GET',
    url: request.url,
    pathname: new URL(request.url).pathname,
    search: new URL(request.url).search,
    headers: Object.fromEntries(request.headers.entries()),
    timestamp: new Date().toISOString()
  })
}

export async function POST(request: NextRequest) {
  const body = await request.text().catch(() => 'Could not read body')
  
  return NextResponse.json({
    message: 'Debug MCP Request Handler',
    method: 'POST',
    url: request.url,
    pathname: new URL(request.url).pathname,
    search: new URL(request.url).search,
    headers: Object.fromEntries(request.headers.entries()),
    body: body.substring(0, 1000), // Limit body size
    timestamp: new Date().toISOString()
  })
}

export async function PUT(request: NextRequest) {
  return NextResponse.json({ message: 'PUT not implemented' })
}

export async function DELETE(request: NextRequest) {
  return NextResponse.json({ message: 'DELETE not implemented' })
}

export async function PATCH(request: NextRequest) {
  return NextResponse.json({ message: 'PATCH not implemented' })
}