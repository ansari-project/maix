import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/causemon/events - Get events for user's monitors
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '7', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    // Get user's active monitors
    const monitors = await prisma.monitor.findMany({
      where: {
        userId: session.user.id,
        isActive: true,
      },
      select: {
        publicFigureId: true,
        topicId: true,
      },
    });

    if (monitors.length === 0) {
      return NextResponse.json([]);
    }

    // Get events for those monitors from the last N days
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);

    const events = await prisma.event.findMany({
      where: {
        eventDate: {
          gte: dateThreshold,
        },
        OR: monitors.map((monitor) => ({
          publicFigureId: monitor.publicFigureId,
          topicId: monitor.topicId,
        })),
      },
      include: {
        publicFigure: {
          select: {
            id: true,
            name: true,
            title: true,
            imageUrl: true,
          },
        },
        topic: {
          select: {
            id: true,
            name: true,
          },
        },
        articles: {
          select: {
            id: true,
            headline: true,
            sourceUrl: true,
            sourcePublisher: true,
            publishedAt: true,
            keyQuotes: true,
          },
          orderBy: {
            publishedAt: 'desc',
          },
        },
      },
      orderBy: {
        eventDate: 'desc',
      },
      take: limit,
    });

    return NextResponse.json(events);
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    );
  }
}