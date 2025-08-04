import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth-utils';
import { resendInvitationEmail } from '@/lib/invitation-email';
import { generateInvitationToken, hashInvitationToken } from '@/lib/invitation-utils';

// POST /api/organizations/[id]/invitations/[invitationId]/resend - Resend invitation
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; invitationId: string }> }
) {
  try {
    const { id: organizationId, invitationId } = await params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to manage invitations
    try {
      await requirePermission('organization', organizationId, 'ADMIN');
    } catch (error) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Get the invitation
    const invitation = await prisma.invitation.findFirst({
      where: {
        id: invitationId,
        organizationId,
      },
      include: {
        inviter: {
          select: { name: true, email: true }
        },
        organization: {
          select: { name: true }
        }
      }
    });

    if (!invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    if (invitation.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Can only resend pending invitations' },
        { status: 400 }
      );
    }

    // Generate new token and update invitation
    const newToken = generateInvitationToken();
    const hashedToken = hashInvitationToken(newToken);

    await prisma.invitation.update({
      where: { id: invitationId },
      data: {
        hashedToken,
        // Optionally extend expiration
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      }
    });

    // Resend email
    try {
      await resendInvitationEmail({
        invitationId: invitation.id,
        email: invitation.email,
        role: invitation.role,
        message: invitation.message,
        expiresAt: invitation.expiresAt,
        inviterName: invitation.inviter.name || invitation.inviter.email,
        entityType: 'organization',
        entityName: invitation.organization?.name || 'Unknown'
      });
    } catch (emailError) {
      console.error('Failed to resend invitation email:', emailError);
      return NextResponse.json(
        { error: 'Failed to send email. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Invitation resent successfully'
    });

  } catch (error) {
    console.error('Error resending invitation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}