import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/causemon/monitors - List user's monitors
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const monitors = await prisma.monitor.findMany({
      where: {
        userId: session.user.id,
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
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(monitors);
  } catch (error) {
    console.error('Error fetching monitors:', error);
    return NextResponse.json(
      { error: 'Failed to fetch monitors' },
      { status: 500 }
    );
  }
}

// POST /api/causemon/monitors - Create new monitor
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { publicFigureId, topicId, emailFrequency = 'daily' } = body;

    if (!publicFigureId || !topicId) {
      return NextResponse.json(
        { error: 'Public figure and topic are required' },
        { status: 400 }
      );
    }

    // Check if monitor already exists
    const existingMonitor = await prisma.monitor.findUnique({
      where: {
        userId_publicFigureId_topicId: {
          userId: session.user.id,
          publicFigureId,
          topicId,
        },
      },
    });

    if (existingMonitor) {
      return NextResponse.json(
        { error: 'Monitor already exists for this combination' },
        { status: 409 }
      );
    }

    // Validate public figure exists
    const publicFigure = await prisma.publicFigure.findUnique({
      where: { id: publicFigureId },
    });

    if (!publicFigure) {
      return NextResponse.json(
        { error: 'Invalid public figure' },
        { status: 400 }
      );
    }

    // Validate topic exists
    const topic = await prisma.topic.findUnique({
      where: { id: topicId },
    });

    if (!topic) {
      return NextResponse.json(
        { error: 'Invalid topic' },
        { status: 400 }
      );
    }

    // For MVP, limit to 1 monitor per user
    const monitorCount = await prisma.monitor.count({
      where: { userId: session.user.id },
    });

    if (monitorCount >= 1) {
      return NextResponse.json(
        { error: 'You can only have one monitor in the beta version' },
        { status: 400 }
      );
    }

    const monitor = await prisma.monitor.create({
      data: {
        userId: session.user.id,
        publicFigureId,
        topicId,
        emailFrequency,
      },
      include: {
        publicFigure: true,
        topic: true,
      },
    });

    return NextResponse.json(monitor, { status: 201 });
  } catch (error) {
    console.error('Error creating monitor:', error);
    return NextResponse.json(
      { error: 'Failed to create monitor' },
      { status: 500 }
    );
  }
}