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

    // Check 24-hour rate limit
    if (monitor.lastSearchedAt) {
      const hoursSinceLastSearch = 
        (Date.now() - monitor.lastSearchedAt.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceLastSearch < 24) {
        const hoursRemaining = Math.ceil(24 - hoursSinceLastSearch);
        return NextResponse.json(
          { 
            error: `Please wait ${hoursRemaining} more hours before searching again`,
            nextSearchAvailable: new Date(monitor.lastSearchedAt.getTime() + 24 * 60 * 60 * 1000)
          },
          { status: 429 }
        );
      }
    }

    // Check global daily limit
    const todaySearchCount = await prisma.monitor.count({
      where: {
        lastSearchedAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0))
        }
      }
    });

    if (todaySearchCount >= 100) {
      return NextResponse.json(
        { error: 'Daily search limit reached. Please try again tomorrow.' },
        { status: 429 }
      );
    }

    // Perform search
    console.log(`Starting search for monitor ${id}: ${monitor.publicFigure.name} on ${monitor.topic.name}`);
    
    const searchService = getSearchService();
    const searchResults = await searchService.searchForEvents(monitor);
    
    // Process results
    const eventProcessor = getEventProcessor();
    const { created, skipped } = await eventProcessor.processSearchResults(
      searchResults,
      monitor.id,
      monitor.publicFigureId,
      monitor.topicId
    );

    // Log approximate cost
    const estimatedTokens = 2000; // Rough estimate
    const estimatedCost = await searchService.estimateCost(estimatedTokens);
    console.log(`Search completed. Cost estimate: $${estimatedCost.toFixed(4)}`);

    return NextResponse.json({
      success: true,
      eventsFound: searchResults.events.length,
      eventsCreated: created,
      eventsSkipped: skipped,
      estimatedCost,
      message: `Found ${searchResults.events.length} events. Created ${created} new events, skipped ${skipped} duplicates.`
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