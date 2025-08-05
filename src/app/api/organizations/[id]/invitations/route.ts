import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { 
  createInvitationSchema, 
  listInvitationsSchema,
  type CreateInvitationInput,
  type ListInvitationsInput 
} from '@/lib/validations/invitation';
import { 
  generateInvitationToken, 
  hashInvitationToken,
  getDefaultExpiration,
  isEmailAlreadyInvited 
} from '@/lib/invitation-utils';
import { requirePermission } from '@/lib/auth-utils';
import { sendInvitationEmail } from '@/lib/invitation-email';

// POST /api/organizations/[id]/invitations - Create invitation
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: organizationId } = await params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to invite (ADMIN or OWNER)
    try {
      await requirePermission('organization', organizationId, 'ADMIN');
    } catch (error) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const validationResult = createInvitationSchema.safeParse({
      ...body,
      organizationId
    });

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const data: CreateInvitationInput = validationResult.data;

    // Check if email already has pending invitation
    if (await isEmailAlreadyInvited(data.email, organizationId)) {
      return NextResponse.json(
        { error: 'Email already has a pending invitation for this organization' },
        { status: 409 }
      );
    }

    // Check if user is already a member
    const existingMember = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId: data.email // We'll need to look up by email instead
        }
      }
    });

    // Look up user by email to check membership
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email }
    });

    if (existingUser) {
      const existingMembership = await prisma.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId,
            userId: existingUser.id
          }
        }
      });

      if (existingMembership) {
        return NextResponse.json(
          { error: 'User is already a member of this organization' },
          { status: 409 }
        );
      }
    }

    // Generate secure token
    const token = generateInvitationToken();
    const hashedToken = hashInvitationToken(token);
    const expiresAt = getDefaultExpiration();

    // Create invitation
    const invitation = await prisma.invitation.create({
      data: {
        hashedToken,
        email: data.email,
        role: data.role,
        message: data.message,
        expiresAt,
        inviterId: session.user.id,
        organizationId,
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

    // Send invitation email
    try {
      await sendInvitationEmail({ invitation, token });
    } catch (emailError) {
      console.error('Failed to send invitation email:', emailError);
      // Don't fail the request if email fails - invitation is still created
    }

    // Return invitation details (without the raw token for security)
    return NextResponse.json({
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      message: invitation.message,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      createdAt: invitation.createdAt,
      inviter: invitation.inviter,
      organization: invitation.organization
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating organization invitation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/organizations/[id]/invitations - List invitations
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: organizationId } = await params;
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

    const { searchParams } = new URL(request.url);
    const queryParams: Partial<ListInvitationsInput> = {
      organizationId,
      status: searchParams.get('status') as any,
      email: searchParams.get('email') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20')
    };

    const validationResult = listInvitationsSchema.safeParse(queryParams);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { page, limit, status, email } = validationResult.data;
    const skip = (page - 1) * limit;

    const where = {
      organizationId,
      ...(status && { status }),
      ...(email && { email: { contains: email, mode: 'insensitive' as const } })
    };

    const [invitations, total] = await Promise.all([
      prisma.invitation.findMany({
        where,
        include: {
          inviter: {
            select: { id: true, name: true, email: true }
          },
          organization: {
            select: { id: true, name: true, slug: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.invitation.count({ where })
    ]);

    return NextResponse.json({
      invitations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error listing organization invitations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}