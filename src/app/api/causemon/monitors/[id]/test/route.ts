import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { GoogleGenerativeAI } from '@google/generative-ai';

// POST /api/causemon/monitors/[id]/test - Test monitor (dry run)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Move params destructuring outside try block for scope
  const { id } = await params;
  
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if monitor exists and belongs to user
    
    console.log('[TEST] Starting test for monitor ID:', id);
    console.log('[TEST] User ID:', session.user.id);
    
    let monitor;
    try {
      monitor = await prisma.monitor.findUnique({
        where: { id },
        include: {
          publicFigure: true,
          topic: true,
        },
      });
      console.log('[TEST] Monitor found:', monitor ? 'Yes' : 'No');
      if (monitor) {
        console.log('[TEST] Monitor details:', {
          id: monitor.id,
          userId: monitor.userId,
          publicFigureId: monitor.publicFigureId,
          topicId: monitor.topicId,
          publicFigure: monitor.publicFigure?.name,
          topic: monitor.topic?.name,
          aliases: monitor.publicFigure?.aliases,
          keywords: monitor.topic?.keywords,
        });
      }
    } catch (dbError) {
      console.error('[TEST] Database error when fetching monitor:', dbError);
      return NextResponse.json(
        { 
          error: 'Database error', 
          details: dbError instanceof Error ? dbError.message : 'Unknown database error',
          monitorId: id 
        },
        { status: 500 }
      );
    }

    if (!monitor) {
      console.log('[TEST] Monitor not found for ID:', id);
      return NextResponse.json(
        { error: 'Monitor not found' },
        { status: 404 }
      );
    }

    if (monitor.userId !== session.user.id) {
      console.log('[TEST] User mismatch. Monitor userId:', monitor.userId, 'Session userId:', session.user.id);
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Initialize Gemini with grounding
    if (!process.env.GOOGLE_API_KEY) {
      return NextResponse.json(
        { error: 'Google API key not configured' },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-pro',
      tools: [{ googleSearchRetrieval: {} }],
    });

    // Search for recent content
    const figureAliases = monitor.publicFigure.aliases?.length > 0 
      ? `(${monitor.publicFigure.aliases.join(', ')})` 
      : '';
    const topicKeywords = monitor.topic.keywords?.length > 0 
      ? `(${monitor.topic.keywords.join(', ')})` 
      : '';
    
    const prompt = `
      Search for recent news articles and statements from the last 24 hours where 
      ${monitor.publicFigure.name} ${figureAliases} 
      mentioned or discussed ${monitor.topic.name} ${topicKeywords}.
      
      For each relevant finding, extract:
      - Event title (what happened)
      - Event date
      - Summary of what was said
      - Key quotes
      - Source URL
      - Source publisher
      
      Return results as JSON array with this structure:
      [{
        title: string,
        eventDate: string,
        summary: string,
        quotes: string[],
        sourceUrl: string,
        publisher: string
      }]
      
      If no relevant results found, return empty array [].
    `;

    console.log('[TEST] Sending prompt to Gemini');
    let result;
    try {
      result = await model.generateContent(prompt);
    } catch (geminiError) {
      console.error('[TEST] Gemini API error:', geminiError);
      return NextResponse.json(
        { 
          error: 'Gemini API error', 
          details: geminiError instanceof Error ? geminiError.message : 'Unknown Gemini error'
        },
        { status: 500 }
      );
    }
    
    const response = await result.response;
    const text = response.text();
    console.log('[TEST] Gemini response received, length:', text.length);

    // Try to parse JSON from response
    let events = [];
    try {
      // Extract JSON from the response (Gemini might include explanation text)
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        events = JSON.parse(jsonMatch[0]);
        console.log('[TEST] Successfully parsed events:', events.length);
      } else {
        console.log('[TEST] No JSON array found in response');
      }
    } catch (parseError) {
      console.error('[TEST] Error parsing Gemini response:', parseError);
      console.log('[TEST] Raw response:', text.substring(0, 500) + '...');
      return NextResponse.json({
        message: 'Test completed but could not parse results',
        rawResponse: text,
        events: [],
      });
    }

    return NextResponse.json({
      message: 'Test completed successfully',
      monitor: {
        publicFigure: monitor.publicFigure.name,
        topic: monitor.topic.name,
      },
      eventsFound: events.length,
      events: events.slice(0, 5), // Return max 5 events for preview
    });
  } catch (error) {
    console.error('[TEST] Unhandled error in test endpoint:', error);
    console.error('[TEST] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    return NextResponse.json(
      { 
        error: 'Failed to test monitor',
        details: error instanceof Error ? error.message : 'Unknown error',
        type: error instanceof Error ? error.constructor.name : typeof error
      },
      { status: 500 }
    );
  }
}