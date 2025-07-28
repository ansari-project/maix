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
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if monitor exists and belongs to user
    const { id } = await params;
    const monitor = await prisma.monitor.findUnique({
      where: { id },
      include: {
        publicFigure: true,
        topic: true,
      },
    });

    if (!monitor) {
      return NextResponse.json(
        { error: 'Monitor not found' },
        { status: 404 }
      );
    }

    if (monitor.userId !== session.user.id) {
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
    const prompt = `
      Search for recent news articles and statements from the last 24 hours where 
      ${monitor.publicFigure.name} (${monitor.publicFigure.aliases.join(', ')}) 
      mentioned or discussed ${monitor.topic.name} (${monitor.topic.keywords.join(', ')}).
      
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

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Try to parse JSON from response
    let events = [];
    try {
      // Extract JSON from the response (Gemini might include explanation text)
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        events = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error('Error parsing Gemini response:', parseError);
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
    console.error('Error testing monitor:', error);
    return NextResponse.json(
      { error: 'Failed to test monitor' },
      { status: 500 }
    );
  }
}