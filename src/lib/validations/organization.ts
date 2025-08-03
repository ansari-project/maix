import { z } from 'zod'

export const createOrganizationSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  mission: z.string().min(10).max(500).optional(),
  description: z.string().min(10).max(5000).optional(),
  url: z.string().url().optional().or(z.literal('')),
  aiEngagement: z.string().min(10).max(2000).optional()
})

export const updateOrganizationSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  mission: z.string().min(10).max(500).optional().or(z.literal('')),
  description: z.string().min(10).max(5000).optional().or(z.literal('')),
  url: z.string().url().optional().or(z.literal('')),
  aiEngagement: z.string().min(10).max(2000).optional().or(z.literal(''))
})

export const inviteMemberSchema = z.object({
  userId: z.string().cuid(),
})

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>