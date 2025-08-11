import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { acceptInvitationSchema } from '@/lib/validations/invitation';
import { validateInvitationToken } from '@/lib/invitation-utils';
import { prisma } from '@/lib/prisma';
import { prepareDualWriteData } from '@/lib/role-migration-utils';

// POST /api/invitations/accept - Accept invitation
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validationResult = acceptInvitationSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { token } = validationResult.data;
    
    // Validate token and get invitation
    const tokenValidation = await validateInvitationToken(token);
    if (!tokenValidation.valid || !tokenValidation.invitation) {
      return NextResponse.json(
        { 
          success: false,
          error: tokenValidation.error,
          message: getValidationErrorMessage(tokenValidation.error)
        },
        { status: 400 }
      );
    }

    const invitation = tokenValidation.invitation;
    
    // Strict email matching for security
    if (session.user.email !== invitation.email) {
      return NextResponse.json(
        { 
          success: false,
          error: 'EMAIL_MISMATCH',
          message: 'This invitation was sent to a different email address'
        },
        { status: 403 }
      );
    }

    // Check if user is already a member
    const existingMembership = await checkExistingMembership(session.user.id, invitation);
    if (existingMembership) {
      return NextResponse.json(
        { 
          success: false,
          error: 'ALREADY_MEMBER',
          message: 'You are already a member of this organization, product, or project'
        },
        { status: 400 }
      );
    }

    // Accept invitation atomically
    const result = await acceptInvitationAtomically(invitation, session.user.id);

    return NextResponse.json({
      success: true,
      message: getSuccessMessage(invitation, result.parentMemberships),
      membership: result.membership,
      parentMemberships: result.parentMemberships
    });

  } catch (error) {
    console.error('Error accepting invitation:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to accept invitation. Please try again.' 
      },
      { status: 500 }
    );
  }
}

async function checkExistingMembership(userId: string, invitation: any) {
  if (invitation.organizationId) {
    return await prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: invitation.organizationId, userId } }
    });
  }
  if (invitation.productId) {
    return await prisma.productMember.findUnique({
      where: { productId_userId: { productId: invitation.productId, userId } }
    });
  }
  if (invitation.projectId) {
    return await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: invitation.projectId, userId } }
    });
  }
  return null;
}

async function acceptInvitationAtomically(invitation: any, userId: string) {
  return await prisma.$transaction(async (tx) => {
    // Mark invitation as accepted
    await tx.invitation.update({
      where: { id: invitation.id },
      data: { 
        status: 'ACCEPTED',
        acceptedAt: new Date()
      }
    });

    // Create membership based on invitation type with hierarchical propagation
    let membership;
    let parentMemberships: any[] = [];

    if (invitation.organizationId) {
      // Organization invitation - simple case, no hierarchy
      const roleData = prepareDualWriteData(invitation.role, true);
      membership = await tx.organizationMember.create({
        data: {
          organizationId: invitation.organizationId,
          userId,
          role: roleData.role,
          unifiedRole: roleData.unifiedRole, // Dual-write for safe migration
          invitationId: invitation.id
        }
      });
    } else if (invitation.productId) {
      // Product invitation - create product membership and ensure org membership
      membership = await tx.productMember.create({
        data: {
          productId: invitation.productId,
          userId,
          role: invitation.role,
          invitationId: invitation.id
        }
      });

      // Get product with organization info
      const product = await tx.product.findUnique({
        where: { id: invitation.productId },
        select: { organizationId: true }
      });

      if (product?.organizationId) {
        // Check if user already has org membership
        const existingOrgMember = await tx.organizationMember.findUnique({
          where: {
            organizationId_userId: {
              organizationId: product.organizationId,
              userId
            }
          }
        });

        if (!existingOrgMember) {
          // Create VIEWER membership for organization
          const memberRoleData = prepareDualWriteData('MEMBER', false);
          const orgMembership = await tx.organizationMember.create({
            data: {
              organizationId: product.organizationId,
              userId,
              role: memberRoleData.role,
              unifiedRole: memberRoleData.unifiedRole, // Dual-write for safe migration
              invitationId: invitation.id
            }
          });
          parentMemberships.push(orgMembership);
        }
      }
    } else if (invitation.projectId) {
      // Project invitation - create project membership and ensure product/org memberships
      membership = await tx.projectMember.create({
        data: {
          projectId: invitation.projectId,
          userId,
          role: invitation.role,
          invitationId: invitation.id
        }
      });

      // Get project with product and organization info
      const project = await tx.project.findUnique({
        where: { id: invitation.projectId },
        select: { 
          productId: true,
          organizationId: true,
          product: {
            select: { organizationId: true }
          }
        }
      });

      // Create product membership if needed
      if (project?.productId) {
        const existingProductMember = await tx.productMember.findUnique({
          where: {
            productId_userId: {
              productId: project.productId,
              userId
            }
          }
        });

        if (!existingProductMember) {
          const productMembership = await tx.productMember.create({
            data: {
              productId: project.productId,
              userId,
              role: 'VIEWER', // Minimum role for parent entities
              invitationId: invitation.id
            }
          });
          parentMemberships.push(productMembership);
        }
      }

      // Create organization membership if needed
      const orgId = project?.organizationId || project?.product?.organizationId;
      if (orgId) {
        const existingOrgMember = await tx.organizationMember.findUnique({
          where: {
            organizationId_userId: {
              organizationId: orgId,
              userId
            }
          }
        });

        if (!existingOrgMember) {
          const memberRoleData = prepareDualWriteData('MEMBER', false);
          const orgMembership = await tx.organizationMember.create({
            data: {
              organizationId: orgId,
              userId,
              role: memberRoleData.role,
              unifiedRole: memberRoleData.unifiedRole, // Dual-write for safe migration
              invitationId: invitation.id
            }
          });
          parentMemberships.push(orgMembership);
        }
      }
    }

    return { membership, parentMemberships };
  });
}

function getValidationErrorMessage(error?: string): string {
  switch (error) {
    case 'INVALID_FORMAT':
      return 'Invalid invitation link format';
    case 'NOT_FOUND':
      return 'This invitation does not exist or has been removed';
    case 'EXPIRED':
      return 'This invitation has expired';
    case 'ALREADY_PROCESSED':
      return 'This invitation has already been accepted or declined';
    default:
      return 'Invalid invitation';
  }
}

function getSuccessMessage(invitation: any, parentMemberships: any[]): string {
  const entityName = invitation.organization?.name || invitation.product?.name || invitation.project?.name;
  const entityType = invitation.organization ? 'organization' : invitation.product ? 'product' : 'project';
  
  let message = `You have successfully joined ${entityName} as a ${invitation.role.toLowerCase()}.`;
  
  // Add information about parent memberships created
  if (parentMemberships.length > 0) {
    const parentInfo = parentMemberships.map(pm => {
      if (pm.organizationId) {
        return 'organization';
      } else if (pm.productId) {
        return 'product';
      }
      return null;
    }).filter(Boolean);
    
    if (parentInfo.length > 0) {
      message += ` You have also been granted access to the parent ${parentInfo.join(' and ')}.`;
    }
  }
  
  return message;
}