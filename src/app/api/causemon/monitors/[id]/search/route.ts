import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getSearchService } from '@/lib/causemon/search-service';
import { getEventProcessor } from '@/lib/causemon/event-processor';

// POST /api/causemon/monitors/[id]/search - Manually trigger search
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Get monitor with relations
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

    if (!monitor.isActive) {
      return NextResponse.json(
        { error: 'Monitor is not active' },
        { status: 400 }
      );
    }

    // Rate limiting temporarily removed for testing

    // Perform search with timing
    const searchStartTime = Date.now();
    console.log(`Starting search for monitor ${id}: ${monitor.publicFigure.name} on ${monitor.topic.name}`);
    
    const searchService = getSearchService();
    const searchResults = await searchService.searchForEvents(monitor);
    const searchDuration = Date.now() - searchStartTime;
    
    // Process results with timing
    const processingStartTime = Date.now();
    const eventProcessor = getEventProcessor();
    const { created, skipped, allEvents } = await eventProcessor.processSearchResults(
      searchResults,
      monitor.id,
      monitor.publicFigureId,
      monitor.topicId
    );
    const processingDuration = Date.now() - processingStartTime;
    const totalDuration = Date.now() - searchStartTime;

    // Log timing information (removed cost calculation)
    console.log(`Search completed in ${totalDuration}ms (search: ${searchDuration}ms, processing: ${processingDuration}ms)`);

    return NextResponse.json({
      success: true,
      eventsFound: searchResults.events.length,
      eventsCreated: created,
      eventsSkipped: skipped,
      allEvents,
      timing: {
        totalDuration,
        searchDuration,
        processingDuration
      },
      message: `Found ${searchResults.events.length} events in ${(totalDuration / 1000).toFixed(1)}s. Created ${created} new events, skipped ${skipped} duplicates.`
    });
  } catch (error) {
    console.error('Search error:', error);
    
    // Provide user-friendly error messages
    if (error instanceof Error) {
      if (error.message.includes('GOOGLE_API_KEY')) {
        return NextResponse.json(
          { error: 'Search service not configured' },
          { status: 503 }
        );
      }
      if (error.message.includes('Search failed after')) {
        return NextResponse.json(
          { error: 'Search failed. Please try again later.' },
          { status: 503 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}