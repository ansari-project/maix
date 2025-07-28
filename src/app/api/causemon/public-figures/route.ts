import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/causemon/public-figures - List available public figures
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const publicFigures = await prisma.publicFigure.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        title: true,
        imageUrl: true,
        aliases: true,
      },
    });

    return NextResponse.json(publicFigures);
  } catch (error) {
    console.error('Error fetching public figures:', error);
    return NextResponse.json(
      { error: 'Failed to fetch public figures' },
      { status: 500 }
    );
  }
}

// POST /api/causemon/public-figures - Create a new public figure (admin only for now)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // For MVP, only waleedk@gmail.com can add public figures
    if (session.user?.email !== 'waleedk@gmail.com') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name, title, imageUrl, aliases } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const publicFigure = await prisma.publicFigure.create({
      data: {
        name,
        title,
        imageUrl,
        aliases: aliases || [],
      },
    });

    return NextResponse.json(publicFigure, { status: 201 });
  } catch (error) {
    console.error('Error creating public figure:', error);
    return NextResponse.json(
      { error: 'Failed to create public figure' },
      { status: 500 }
    );
  }
}