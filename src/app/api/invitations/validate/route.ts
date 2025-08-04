import { NextResponse } from 'next/server';
import { validateTokenSchema } from '@/lib/validations/invitation';
import { validateInvitationToken } from '@/lib/invitation-utils';

// POST /api/invitations/validate - Validate invitation token (public endpoint)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validationResult = validateTokenSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { token } = validationResult.data;
    const result = await validateInvitationToken(token);

    if (!result.valid) {
      return NextResponse.json(
        { 
          valid: false, 
          error: result.error,
          message: getErrorMessage(result.error)
        },
        { status: 400 }
      );
    }

    // Return invitation details without sensitive information
    return NextResponse.json({
      valid: true,
      invitation: {
        id: result.invitation!.id,
        email: result.invitation!.email,
        role: result.invitation!.role,
        message: result.invitation!.message,
        expiresAt: result.invitation!.expiresAt,
        createdAt: result.invitation!.createdAt,
        inviter: result.invitation!.inviter,
        organization: result.invitation!.organization,
        product: result.invitation!.product,
        project: result.invitation!.project,
      }
    });

  } catch (error) {
    console.error('Error validating invitation token:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function getErrorMessage(error?: string): string {
  switch (error) {
    case 'INVALID_FORMAT':
      return 'Invalid invitation token format';
    case 'NOT_FOUND':
      return 'Invitation not found or has been removed';
    case 'EXPIRED':
      return 'This invitation has expired';
    case 'ALREADY_PROCESSED':
      return 'This invitation has already been accepted or declined';
    default:
      return 'Invalid invitation token';
  }
}