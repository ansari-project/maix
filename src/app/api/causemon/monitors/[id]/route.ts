import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// DELETE /api/causemon/monitors/[id] - Delete a monitor
export async function DELETE(
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
      select: { userId: true },
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

    await prisma.monitor.delete({
      where: { id },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting monitor:', error);
    return NextResponse.json(
      { error: 'Failed to delete monitor' },
      { status: 500 }
    );
  }
}

// PATCH /api/causemon/monitors/[id] - Update monitor settings
export async function PATCH(
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
      select: { userId: true },
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

    const body = await request.json();
    const { isActive, emailFrequency } = body;

    const updatedMonitor = await prisma.monitor.update({
      where: { id },
      data: {
        ...(isActive !== undefined && { isActive }),
        ...(emailFrequency && { emailFrequency }),
      },
      include: {
        publicFigure: true,
        topic: true,
      },
    });

    return NextResponse.json(updatedMonitor);
  } catch (error) {
    console.error('Error updating monitor:', error);
    return NextResponse.json(
      { error: 'Failed to update monitor' },
      { status: 500 }
    );
  }
}