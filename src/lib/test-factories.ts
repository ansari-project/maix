import { TodoStatus } from '@prisma/client'
import type { User, Project, Todo, Post, Organization, Product } from '@prisma/client'

/**
 * Type-safe mock factories for test data
 * These factories provide consistent, complete mock objects that satisfy TypeScript
 */

export const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-123',
  email: 'test@example.com',
  username: 'testuser',
  name: 'Test User',
  image: null,
  password: null,
  specialty: null,
  experienceLevel: null,
  bio: null,
  linkedinUrl: null,
  githubUrl: null,
  portfolioUrl: null,
  skills: [],
  availability: null,
  timezone: null,
  isActive: true,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
  lastDigestSentAt: null,
  ...overrides,
})

export const createMockProject = (overrides: Partial<Project> = {}): Project => ({
  id: 'project-123',
  name: 'Test Project',
  goal: 'Test project goal',
  description: 'A test project for development',
  contactEmail: 'contact@test.com',
  helpType: 'MVP',
  status: 'AWAITING_VOLUNTEERS',
  targetCompletionDate: null,
  isActive: true,
  isPersonal: false,
  personalCategory: null,
  visibility: 'PUBLIC',
  ownerId: 'user-123',
  productId: null,
  organizationId: null,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
  ...overrides,
})

export const createMockTodo = (overrides: Partial<Todo> = {}): Todo => ({
  id: 'todo-123',
  title: 'Test Todo',
  description: null,
  status: TodoStatus.NOT_STARTED,
  startDate: null,
  dueDate: null,
  eventId: null,
  assigneeId: null,
  creatorId: 'user-123',
  projectId: 'project-123',
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
  ...overrides,
})

export const createMockPost = (overrides: Partial<Post> = {}): Post => ({
  id: 'post-123',
  type: 'QUESTION',
  content: 'Test post content',
  visibility: 'PUBLIC',
  authorId: 'user-123',
  parentId: null,
  projectId: null,
  projectDiscussionThreadId: null,
  productId: null,
  productDiscussionThreadId: null,
  maixEventId: null,
  todoId: null,
  bestAnswerId: null,
  isResolved: false,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
  ...overrides,
})

export const createMockOrganization = (overrides: Partial<Organization> = {}): Organization => ({
  id: 'org-123',
  name: 'Test Organization',
  slug: 'test-org',
  mission: 'Test organization mission',
  description: 'Test organization description',
  url: null,
  aiEngagement: 'Test AI engagement',
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
  ...overrides,
})

export const createMockProduct = (overrides: Partial<Product> = {}): Product => ({
  id: 'product-123',
  name: 'Test Product',
  description: 'Test product description',
  url: null,
  visibility: 'PUBLIC',
  ownerId: 'user-123',
  organizationId: null,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
  ...overrides,
})

export const createMockSession = (userOverrides: Partial<User> = {}) => {
  const user = createMockUser(userOverrides)
  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  }
}

/**
 * Utility function to create NextAuth session mock with proper typing
 */
export const createMockNextAuthSession = (userOverrides: Partial<User> = {}) => {
  const user = createMockUser(userOverrides)
  return {
    user: {
      email: user.email,
      name: user.name,
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  }
}