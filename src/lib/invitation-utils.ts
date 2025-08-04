import { randomBytes, createHash, timingSafeEqual } from 'crypto';
import { prisma } from '@/lib/prisma';
import type { Invitation, InvitationStatus } from '@prisma/client';

/**
 * Generate a secure invitation token using crypto.randomBytes
 * Returns 64-character hex string (256-bit entropy)
 */
export function generateInvitationToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Hash a token using SHA-256 for secure database storage
 */
export function hashInvitationToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Generate default expiration date (7 days from now)
 */
export function getDefaultExpiration(): Date {
  const expiration = new Date();
  expiration.setDate(expiration.getDate() + 7);
  return expiration;
}

/**
 * Generate invitation URL for email
 */
export function generateInvitationUrl(token: string, baseUrl: string = process.env.NEXT_PUBLIC_URL!): string {
  return `${baseUrl}/accept-invitation?token=${token}`;
}

/**
 * Check if email already has pending invitation for the same entity
 */
export async function isEmailAlreadyInvited(email: string, entityId: string): Promise<boolean> {
  const existing = await prisma.invitation.findFirst({
    where: {
      email,
      status: 'PENDING',
      OR: [
        { organizationId: entityId },
        { productId: entityId },
        { projectId: entityId }
      ]
    }
  });
  return !!existing;
}

/**
 * Validation result type for token validation
 */
export type TokenValidationResult = {
  valid: boolean;
  error?: 'INVALID_FORMAT' | 'NOT_FOUND' | 'EXPIRED' | 'ALREADY_PROCESSED';
  invitation?: Invitation & {
    inviter: { id: string; name: string | null; email: string };
    organization?: { id: string; name: string; slug: string } | null;
    product?: { id: string; name: string } | null;
    project?: { id: string; name: string } | null;
  };
};

/**
 * Validate invitation token with security best practices
 * - Hashes token for database lookup (prevents timing attacks)
 * - Checks expiration before status (security best practice)
 * - Returns comprehensive validation result
 */
export async function validateInvitationToken(token: string): Promise<TokenValidationResult> {
  // Input validation to prevent timing attacks and SQL issues
  if (!token || token.length !== 64 || !/^[0-9a-f]+$/i.test(token)) {
    return { valid: false, error: 'INVALID_FORMAT' };
  }

  // Hash the token for secure database lookup
  const hashedToken = hashInvitationToken(token);

  const invitation = await prisma.invitation.findUnique({
    where: { hashedToken },
    include: {
      inviter: {
        select: { id: true, name: true, email: true }
      },
      organization: {
        select: { id: true, name: true, slug: true }
      },
      product: {
        select: { id: true, name: true }
      },
      project: {
        select: { id: true, name: true }
      }
    }
  });

  if (!invitation) {
    return { valid: false, error: 'NOT_FOUND' };
  }

  // Security: Check expiration BEFORE status to prevent information leakage
  if (invitation.expiresAt < new Date()) {
    return { valid: false, error: 'EXPIRED', invitation };
  }

  if (invitation.status !== 'PENDING') {
    return { valid: false, error: 'ALREADY_PROCESSED', invitation };
  }

  return { valid: true, invitation };
}

/**
 * Atomically redeem an invitation token
 * Uses database transaction to prevent race conditions
 * Returns success status and membership info
 */
export async function redeemInvitationToken(
  token: string,
  userId: string
): Promise<{
  success: boolean;
  error?: string;
  membership?: any;
}> {
  const hashedToken = hashInvitationToken(token);

  try {
    return await prisma.$transaction(async (tx) => {
      // Atomic update to mark invitation as accepted
      // This prevents race conditions from duplicate redemption
      const updatedInvitation = await tx.invitation.updateMany({
        where: {
          hashedToken,
          status: 'PENDING',
          expiresAt: { gt: new Date() }
        },
        data: {
          status: 'ACCEPTED',
          acceptedAt: new Date()
        }
      });

      // Check if update was successful (invitation was valid and pending)
      if (updatedInvitation.count === 0) {
        return { success: false, error: 'INVALID_OR_EXPIRED' };
      }

      // Get the invitation details for membership creation
      const invitation = await tx.invitation.findUnique({
        where: { hashedToken },
        include: {
          organization: true,
          product: true,
          project: true
        }
      });

      if (!invitation) {
        throw new Error('Invitation not found after update');
      }

      // Create appropriate membership based on invitation type
      let membership;
      
      if (invitation.organizationId) {
        membership = await tx.organizationMember.create({
          data: {
            userId,
            organizationId: invitation.organizationId,
            role: invitation.role === 'OWNER' ? 'OWNER' : 'MEMBER', // Map UnifiedRole to OrgRole
            invitationId: invitation.id
          }
        });
      } else if (invitation.productId) {
        membership = await tx.productMember.create({
          data: {
            userId,
            productId: invitation.productId,
            role: invitation.role,
            invitationId: invitation.id
          }
        });
      } else if (invitation.projectId) {
        membership = await tx.projectMember.create({
          data: {
            userId,
            projectId: invitation.projectId,
            role: invitation.role,
            invitationId: invitation.id
          }
        });
      }

      return { success: true, membership };
    });
  } catch (error) {
    console.error('Error redeeming invitation:', error);
    return { success: false, error: 'REDEMPTION_FAILED' };
  }
}

/**
 * Cleanup expired invitations (for background job)
 */
export async function cleanupExpiredInvitations(): Promise<number> {
  const result = await prisma.invitation.deleteMany({
    where: {
      status: 'PENDING',
      expiresAt: { lt: new Date() }
    }
  });
  
  return result.count;
}