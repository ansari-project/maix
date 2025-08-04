import { z } from 'zod';
import { UnifiedRole, InvitationStatus } from '@prisma/client';

/**
 * Schema for creating a new invitation
 */
export const createInvitationSchema = z.object({
  email: z.string().email('Invalid email address').max(255, 'Email too long'),
  role: z.nativeEnum(UnifiedRole, {
    errorMap: () => ({ message: 'Role must be OWNER, ADMIN, MEMBER, or VIEWER' })
  }),
  message: z.string().max(2000, 'Message too long').optional(),
  
  // Entity constraints: exactly one must be provided
  organizationId: z.string().cuid('Invalid organization ID').optional(),
  productId: z.string().cuid('Invalid product ID').optional(),
  projectId: z.string().cuid('Invalid project ID').optional(),
}).refine(data => {
  const entities = [data.organizationId, data.productId, data.projectId].filter(Boolean);
  return entities.length === 1;
}, {
  message: "Exactly one entity (organization, product, or project) must be specified"
});

/**
 * Schema for accepting an invitation
 */
export const acceptInvitationSchema = z.object({
  token: z.string()
    .length(64, 'Token must be exactly 64 characters')
    .regex(/^[0-9a-f]+$/i, 'Token must contain only hexadecimal characters')
});

/**
 * Schema for invitation token validation (API use)
 */
export const validateTokenSchema = z.object({
  token: z.string()
    .length(64, 'Invalid token format')
    .regex(/^[0-9a-f]+$/i, 'Invalid token format')
});

/**
 * Schema for updating invitation status
 */
export const updateInvitationSchema = z.object({
  status: z.nativeEnum(InvitationStatus, {
    errorMap: () => ({ message: 'Status must be PENDING, ACCEPTED, DECLINED, EXPIRED, or CANCELLED' })
  })
});

/**
 * Schema for listing invitations with filters
 */
export const listInvitationsSchema = z.object({
  organizationId: z.string().cuid().optional(),
  productId: z.string().cuid().optional(),
  projectId: z.string().cuid().optional(),
  status: z.nativeEnum(InvitationStatus).optional(),
  email: z.string().email().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

/**
 * Schema for bulk invitation operations
 */
export const bulkInviteSchema = z.object({
  emails: z.array(z.string().email('Invalid email address'))
    .min(1, 'At least one email is required')
    .max(50, 'Maximum 50 emails allowed'),
  role: z.nativeEnum(UnifiedRole),
  message: z.string().max(2000).optional(),
  
  // Entity constraints: exactly one must be provided
  organizationId: z.string().cuid().optional(),
  productId: z.string().cuid().optional(),
  projectId: z.string().cuid().optional(),
}).refine(data => {
  const entities = [data.organizationId, data.productId, data.projectId].filter(Boolean);
  return entities.length === 1;
}, {
  message: "Exactly one entity (organization, product, or project) must be specified"
});

/**
 * Type exports for use in API routes and components
 */
export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;
export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;
export type ValidateTokenInput = z.infer<typeof validateTokenSchema>;
export type UpdateInvitationInput = z.infer<typeof updateInvitationSchema>;
export type ListInvitationsInput = z.infer<typeof listInvitationsSchema>;
export type BulkInviteInput = z.infer<typeof bulkInviteSchema>;