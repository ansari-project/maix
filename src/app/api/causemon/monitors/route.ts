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
    const { publicFigureName, topicName, emailFrequency = 'daily' } = body;

    if (!publicFigureName || !topicName) {
      return NextResponse.json(
        { error: 'Public figure and topic are required' },
        { status: 400 }
      );
    }

    // Find or create public figure (case-insensitive)
    let publicFigure = await prisma.publicFigure.findFirst({
      where: {
        name: {
          equals: publicFigureName,
          mode: 'insensitive'
        }
      }
    });

    if (!publicFigure) {
      publicFigure = await prisma.publicFigure.create({
        data: { 
          name: publicFigureName,
          aliases: []
        }
      });
    }

    // Find or create topic (case-insensitive)
    let topic = await prisma.topic.findFirst({
      where: {
        name: {
          equals: topicName,
          mode: 'insensitive'
        }
      }
    });

    if (!topic) {
      topic = await prisma.topic.create({
        data: { 
          name: topicName,
          keywords: []
        }
      });
    }

    // Check if monitor already exists
    const existingMonitor = await prisma.monitor.findUnique({
      where: {
        userId_publicFigureId_topicId: {
          userId: session.user.id,
          publicFigureId: publicFigure.id,
          topicId: topic.id,
        },
      },
    });

    if (existingMonitor) {
      return NextResponse.json(
        { error: 'Monitor already exists for this combination' },
        { status: 409 }
      );
    }

    const monitor = await prisma.monitor.create({
      data: {
        userId: session.user.id,
        publicFigureId: publicFigure.id,
        topicId: topic.id,
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