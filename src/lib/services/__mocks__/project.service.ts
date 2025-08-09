import { z } from 'zod'

// Export validation schemas
export const createPersonalProjectSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  personalCategory: z.string().optional(),
})

// Mock functions
export const createPersonalProject = jest.fn()
export const getPersonalProjects = jest.fn()
export const sharePersonalProject = jest.fn()
export const unsharePersonalProject = jest.fn()