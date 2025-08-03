import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

export interface TestUserData {
  id: string
  email: string
  password: string
  name: string
}

export class DatabaseHelper {
  /**
   * Create a test user directly in the database
   */
  static async createTestUser(userData: Omit<TestUserData, 'id'>): Promise<TestUserData> {
    const hashedPassword = await hash(userData.password, 10)
    
    const user = await prisma.user.create({
      data: {
        email: userData.email,
        name: userData.name,
        username: userData.email.split('@')[0], // Generate username from email
        password: hashedPassword,
      }
    })
    
    return {
      id: user.id,
      email: user.email,
      password: userData.password, // Return plain password for testing
      name: user.name || ''
    }
  }

  /**
   * Create a test project
   */
  static async createTestProject(ownerId: string, projectData?: Partial<any>) {
    return await prisma.project.create({
      data: {
        name: projectData?.name || 'Test Project',
        goal: projectData?.goal || 'Test project goal',
        description: projectData?.description || 'This is a test project description that is long enough to meet validation requirements.',
        helpType: projectData?.helpType || 'MVP',
        contactEmail: projectData?.contactEmail || 'project@test.com',
        ownerId,
        visibility: projectData?.visibility || 'PUBLIC',
        isActive: projectData?.isActive ?? true,
        ...projectData
      }
    })
  }

  /**
   * Create a test organization
   */
  static async createTestOrganization(ownerId: string, orgData?: Partial<any>) {
    const org = await prisma.organization.create({
      data: {
        name: orgData?.name || 'Test Organization',
        slug: orgData?.slug || `test-org-${Date.now()}`,
        ...orgData
      }
    })
    
    // Add owner as member
    await prisma.organizationMember.create({
      data: {
        organizationId: org.id,
        userId: ownerId,
        role: 'OWNER'
      }
    })
    
    return org
  }

  /**
   * Create a test product
   */
  static async createTestProduct(ownerId: string, productData?: Partial<any>) {
    return await prisma.product.create({
      data: {
        name: productData?.name || 'Test Product',
        description: productData?.description || 'This is a test product description.',
        ownerId,
        visibility: productData?.visibility || 'PUBLIC',
        ...productData
      }
    })
  }

  /**
   * Create a test post (question, update, etc)
   */
  static async createTestPost(authorId: string, postData?: Partial<any>) {
    return await prisma.post.create({
      data: {
        type: postData?.type || 'QUESTION',
        content: postData?.content || 'This is a test question about AI development?',
        authorId,
        ...postData
      }
    })
  }

  /**
   * Clean up test data
   */
  static async cleanup() {
    // Delete in order to respect foreign key constraints
    await prisma.notification.deleteMany({})
    await prisma.comment.deleteMany({})
    await prisma.post.deleteMany({})
    await prisma.application.deleteMany({})
    await prisma.project.deleteMany({})
    await prisma.product.deleteMany({})
    await prisma.organizationMember.deleteMany({})
    await prisma.organization.deleteMany({})
    await prisma.notificationPreference.deleteMany({})
    await prisma.personalAccessToken.deleteMany({})
    await prisma.user.deleteMany({
      where: {
        email: {
          contains: '@test.com'
        }
      }
    })
  }

  /**
   * Disconnect from database
   */
  static async disconnect() {
    await prisma.$disconnect()
  }
}