import { z } from 'zod'

// Password validation schema with strength requirements
export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters long')
  .max(128, 'Password must be less than 128 characters long')
  .regex(/^(?=.*[a-z])/, 'Password must contain at least one lowercase letter')
  .regex(/^(?=.*[A-Z])/, 'Password must contain at least one uppercase letter')
  .regex(/^(?=.*\d)/, 'Password must contain at least one number')
  .regex(/^(?=.*[@$!%*?&])/, 'Password must contain at least one special character (@$!%*?&)')

// Authentication schemas
export const signupSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters long')
    .max(50, 'Name must be less than 50 characters long')
    .regex(/^[a-zA-Z\s]+$/, 'Name can only contain letters and spaces'),
  username: z.string()
    .min(3, 'Username must be at least 3 characters long')
    .max(30, 'Username must be less than 30 characters long')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens')
    .refine(val => !val.startsWith('_') && !val.startsWith('-'), 'Username cannot start with underscore or hyphen')
    .refine(val => !val.endsWith('_') && !val.endsWith('-'), 'Username cannot end with underscore or hyphen'),
  email: z.string()
    .email('Invalid email address')
    .max(255, 'Email must be less than 255 characters long'),
  password: passwordSchema,
})

export const signinSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

// Profile validation schemas
export const profileUpdateSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters long')
    .max(50, 'Name must be less than 50 characters long')
    .regex(/^[a-zA-Z\s]+$/, 'Name can only contain letters and spaces')
    .optional(),
  username: z.string()
    .min(3, 'Username must be at least 3 characters long')
    .max(30, 'Username must be less than 30 characters long')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens')
    .refine(val => !val.startsWith('_') && !val.startsWith('-'), 'Username cannot start with underscore or hyphen')
    .refine(val => !val.endsWith('_') && !val.endsWith('-'), 'Username cannot end with underscore or hyphen')
    .optional(),
  bio: z.string()
    .max(1000, 'Bio must be less than 1000 characters long')
    .optional(),
  specialty: z.enum(['AI', 'FULL_STACK', 'PROGRAM_MANAGER']).optional(),
  experienceLevel: z.enum(['HOBBYIST', 'INTERN', 'NEW_GRAD', 'SENIOR']).optional(),
  skills: z.array(z.string().min(1).max(50))
    .max(20, 'Maximum 20 skills allowed')
    .optional(),
  linkedinUrl: z.string()
    .url('Invalid LinkedIn URL')
    .regex(/^https:\/\/(www\.)?linkedin\.com\/in\/[a-zA-Z0-9-]+\/?$/, 'Must be a valid LinkedIn profile URL')
    .optional()
    .or(z.literal('')),
  githubUrl: z.string()
    .url('Invalid GitHub URL')
    .regex(/^https:\/\/(www\.)?github\.com\/[a-zA-Z0-9-]+\/?$/, 'Must be a valid GitHub profile URL')
    .optional()
    .or(z.literal('')),
  portfolioUrl: z.string()
    .url('Invalid portfolio URL')
    .optional()
    .or(z.literal('')),
  availability: z.string()
    .max(100, 'Availability must be less than 100 characters long')
    .optional(),
  timezone: z.string()
    .max(50, 'Timezone must be less than 50 characters long')
    .optional(),
})

// Project validation schemas
export const projectCreateSchema = z.object({
  name: z.string()
    .min(3, 'Project name must be at least 3 characters long')
    .max(255, 'Project name must be less than 255 characters long'),
  goal: z.string()
    .min(10, 'Project goal must be at least 10 characters long')
    .max(500, 'Project goal must be less than 500 characters long'),
  description: z.string()
    .min(50, 'Description must be at least 50 characters long')
    .max(5000, 'Description must be less than 5000 characters long'),
  contactEmail: z.string()
    .email('Invalid contact email address')
    .max(255, 'Contact email must be less than 255 characters long'),
  helpType: z.enum(['ADVICE', 'PROTOTYPE', 'FEATURE', 'MVP', 'FULL_PRODUCT']),
  status: z.enum(['AWAITING_VOLUNTEERS', 'PLANNING', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED']).optional(),
  targetCompletionDate: z.string()
    .datetime('Invalid date format')
    .optional()
    .or(z.literal('')),
  productId: z.string().cuid('Invalid product ID format').optional(),
  visibility: z.enum(['PUBLIC', 'PRIVATE']).default('PUBLIC').optional(),
  organizationId: z.string().cuid('Invalid organization ID format').optional(),
})

export const projectUpdateSchema = projectCreateSchema.partial()

// Product validation schemas
export const productCreateSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  description: z.string().min(1, "Product description is required"),
  url: z.string().url("Invalid URL").optional().or(z.literal("")),
  visibility: z.enum(['PUBLIC', 'PRIVATE']).default('PUBLIC').optional(),
  organizationId: z.string().cuid('Invalid organization ID format').optional(),
})

export const productUpdateSchema = productCreateSchema.partial()

// Post validation schemas
export const postCreateSchema = z.object({
  type: z.enum(['QUESTION', 'ANSWER', 'PROJECT_UPDATE', 'PRODUCT_UPDATE']),
  content: z.string().min(1),
  projectId: z.string().cuid().optional(),
  productId: z.string().cuid().optional(),
  parentId: z.string().cuid().optional(),
  todoId: z.string().cuid().optional(),
  // Optional project status update for PROJECT_UPDATE posts
  projectStatus: z.enum(['AWAITING_VOLUNTEERS', 'PLANNING', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED']).optional(),
})
.refine(data => !(data.type === 'PROJECT_UPDATE' && !data.projectId), {
  message: "projectId is required for PROJECT_UPDATE",
  path: ["projectId"],
})
.refine(data => !(data.type === 'PRODUCT_UPDATE' && !data.productId), {
  message: "productId is required for PRODUCT_UPDATE", 
  path: ["productId"],
})
.refine(data => !(data.type === 'ANSWER' && !data.parentId), {
  message: "parentId is required for ANSWER",
  path: ["parentId"],
})
.refine(data => !(data.projectStatus && data.type !== 'PROJECT_UPDATE'), {
  message: "projectStatus can only be used with PROJECT_UPDATE type",
  path: ["projectStatus"],
})

// Application validation schemas
export const applicationCreateSchema = z.object({
  message: z.string()
    .min(10, 'Application message must be at least 10 characters long')
    .max(2000, 'Application message must be less than 2000 characters long'),
})

export const applicationUpdateSchema = z.object({
  status: z.enum(['PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN']).optional(),
  message: z.string()
    .max(1000, 'Response message must be less than 1000 characters long')
    .optional(),
}).refine(
  (data) => data.status !== undefined || data.message !== undefined,
  { message: 'At least one field (status or message) must be provided' }
)

// Comment validation schemas
export const commentCreateSchema = z.object({
  content: z.string().min(1, 'Comment content is required'),
  postId: z.string().cuid('Invalid post ID format'),
})

export const commentUpdateSchema = z.object({
  content: z.string().min(1, 'Comment content is required'),
})

export const postUpdateSchema = z.object({
  content: z.string().min(1, 'Post content is required'),
})

export const resolveQuestionSchema = z.object({
  bestAnswerId: z.string().cuid('Invalid answer ID format'),
})

// Common validation helpers
export const idSchema = z.string().cuid('Invalid ID format')

export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10),
})

export const searchSchema = z.object({
  query: z.string().max(255).optional(),
  helpType: z.enum(['ADVICE', 'PROTOTYPE', 'FEATURE', 'MVP', 'FULL_PRODUCT']).optional(),
  skills: z.array(z.string()).optional(),
})

// Type exports for TypeScript
export type SignupInput = z.infer<typeof signupSchema>
export type SigninInput = z.infer<typeof signinSchema>
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>
export type ProjectCreateInput = z.infer<typeof projectCreateSchema>
export type ProjectUpdateInput = z.infer<typeof projectUpdateSchema>
export type ApplicationCreateInput = z.infer<typeof applicationCreateSchema>
export type ApplicationUpdateInput = z.infer<typeof applicationUpdateSchema>
export type SearchInput = z.infer<typeof searchSchema>
export type PaginationInput = z.infer<typeof paginationSchema>