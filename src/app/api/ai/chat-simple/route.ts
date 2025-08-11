import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { streamText } from 'ai'
import { google } from '@ai-sdk/google'

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // 2. Parse request
    const { messages } = await request.json()

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages array is required' }, { status: 400 })
    }

    // 3. Stream AI response WITHOUT any MCP tools
    console.log('📝 Simple AI chat - no tools, just streaming')
    const stream = await streamText({
      model: google('gemini-2.0-flash'),
      messages: messages,
    })

    return stream.toTextStreamResponse()

  } catch (error) {
    console.error('Simple AI Chat Error:', error)
    return NextResponse.json(
      { error: 'AI service error', details: error instanceof Error ? error.message : 'Unknown error' }, 
      { status: 500 }
    )
  }
}