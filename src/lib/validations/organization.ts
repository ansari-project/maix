import { z } from 'zod'

export const createOrganizationSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens')
})

export const updateOrganizationSchema = z.object({
  name: z.string().min(2).max(100).optional(),
})

export const inviteMemberSchema = z.object({
  userId: z.string().cuid(),
})

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>