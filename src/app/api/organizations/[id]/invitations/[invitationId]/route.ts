import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { updateInvitationSchema } from '@/lib/validations/invitation';
import { requirePermission } from '@/lib/auth-utils';

// GET /api/organizations/[id]/invitations/[invitationId] - Get invitation details
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; invitationId: string }> }
) {
  try {
    const { id: organizationId, invitationId } = await params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to view invitations (ADMIN or OWNER)
    try {
      await requirePermission('organization', organizationId, 'ADMIN');
    } catch (error) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const invitation = await prisma.invitation.findFirst({
      where: {
        id: invitationId,
        organizationId
      },
      include: {
        inviter: {
          select: { id: true, name: true, email: true }
        },
        organization: {
          select: { id: true, name: true, slug: true }
        }
      }
    });

    if (!invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    return NextResponse.json(invitation);

  } catch (error) {
    console.error('Error fetching organization invitation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/organizations/[id]/invitations/[invitationId] - Update invitation status
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; invitationId: string }> }
) {
  try {
    const { id: organizationId, invitationId } = await params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to manage invitations (ADMIN or OWNER)
    try {
      await requirePermission('organization', organizationId, 'ADMIN');
    } catch (error) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const validationResult = updateInvitationSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { status } = validationResult.data;

    // Check if invitation exists and belongs to this organization
    const existingInvitation = await prisma.invitation.findFirst({
      where: {
        id: invitationId,
        organizationId
      }
    });

    if (!existingInvitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    // Update invitation status
    const updatedInvitation = await prisma.invitation.update({
      where: { id: invitationId },
      data: {
        status,
        ...(status === 'CANCELLED' && { updatedAt: new Date() })
      },
      include: {
        inviter: {
          select: { id: true, name: true, email: true }
        },
        organization: {
          select: { id: true, name: true, slug: true }
        }
      }
    });

    return NextResponse.json(updatedInvitation);

  } catch (error) {
    console.error('Error updating organization invitation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/organizations/[id]/invitations/[invitationId] - Cancel/delete invitation
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; invitationId: string }> }
) {
  try {
    const { id: organizationId, invitationId } = await params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to manage invitations (ADMIN or OWNER)
    try {
      await requirePermission('organization', organizationId, 'ADMIN');
    } catch (error) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Check if invitation exists and belongs to this organization
    const existingInvitation = await prisma.invitation.findFirst({
      where: {
        id: invitationId,
        organizationId
      }
    });

    if (!existingInvitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    // Only allow deletion of PENDING invitations
    if (existingInvitation.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Only pending invitations can be deleted' },
        { status: 400 }
      );
    }

    // Delete the invitation
    await prisma.invitation.delete({
      where: { id: invitationId }
    });

    return NextResponse.json({ message: 'Invitation deleted successfully' });

  } catch (error) {
    console.error('Error deleting organization invitation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}