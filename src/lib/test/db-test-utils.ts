/**
 * Database Test Utilities
 * Provides helpers for integration testing with a real test database
 */

import { PrismaClient } from '@prisma/client'
import { execSync } from 'child_process'
import * as dotenv from 'dotenv'
import * as path from 'path'
import * as fs from 'fs'

// Load test environment variables
const testEnvPath = path.join(process.cwd(), '.env.test')
if (fs.existsSync(testEnvPath)) {
  dotenv.config({ path: testEnvPath })
} else {
  console.warn('⚠️  .env.test not found. Using default test configuration.')
  // Set minimal test defaults
  process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/maix_test'
  // NODE_ENV is read-only in TypeScript, skip setting it
}

// Create a separate Prisma client for tests
export const prismaTest = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  },
  log: process.env.DEBUG ? ['query', 'error', 'warn'] : ['error']
})

/**
 * Setup test database
 * Creates schema and runs migrations
 */
export async function setupTestDatabase(): Promise<void> {
  try {
    console.log('🔧 Setting up test database...')
    
    // Reset database schema
    await prismaTest.$executeRawUnsafe(`
      DROP SCHEMA IF EXISTS public CASCADE;
      CREATE SCHEMA public;
    `)
    
    // Run migrations
    execSync('npx prisma migrate deploy', {
      env: {
        ...process.env,
        DATABASE_URL: process.env.DATABASE_URL
      }
    })
    
    console.log('✅ Test database ready')
  } catch (error) {
    console.error('❌ Failed to setup test database:', error)
    throw error
  }
}

/**
 * Clean up test database
 * Truncates all tables but keeps schema
 */
export async function cleanupTestDatabase(): Promise<void> {
  const tables = [
    'Registration',
    'EventConversation', 
    'MaixEvent',
    'Todo',
    'PersonalAccessToken',
    'ProjectCollaborator',
    'Project',
    'Product',
    'OrganizationMember',
    'Organization',
    'Post',
    'Notification',
    'User'
  ]
  
  try {
    // Disable foreign key checks temporarily
    await prismaTest.$executeRawUnsafe('SET session_replication_role = replica;')
    
    // Truncate all tables
    for (const table of tables) {
      await prismaTest.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`)
    }
    
    // Re-enable foreign key checks
    await prismaTest.$executeRawUnsafe('SET session_replication_role = DEFAULT;')
  } catch (error) {
    console.error('Failed to cleanup database:', error)
    throw error
  }
}

/**
 * Create test user
 */
export async function createTestUser(data?: Partial<{
  email: string
  name: string
  username: string
}>) {
  return prismaTest.user.create({
    data: {
      email: data?.email || 'test@example.com',
      name: data?.name || 'Test User',
      username: data?.username || 'testuser',
      password: 'hashed_password', // In real tests, use proper hashing
    }
  })
}

/**
 * Create test organization
 */
export async function createTestOrganization(ownerId: string, data?: Partial<{
  name: string
  slug: string
}>) {
  return prismaTest.organization.create({
    data: {
      name: data?.name || 'Test Organization',
      slug: data?.slug || 'test-org',
      description: 'Test organization for integration tests',
      members: {
        create: {
          userId: ownerId,
          role: 'OWNER'
        }
      }
    },
    include: {
      members: true
    }
  })
}

/**
 * Create test event
 */
export async function createTestEvent(organizationId: string, createdBy: string, data?: Partial<{
  name: string
  description: string
  date: Date
  capacity: number
  isPublic: boolean
}>) {
  return prismaTest.maixEvent.create({
    data: {
      organizationId,
      createdBy,
      name: data?.name || 'Test Event',
      description: data?.description || 'Test event description',
      date: data?.date || new Date('2025-12-01T10:00:00Z'),
      capacity: data?.capacity || 50,
      isPublic: data?.isPublic ?? true,
      status: 'PUBLISHED',
      venueJson: {
        name: 'Test Venue',
        address: '123 Test St',
        capacity: 50
      }
    }
  })
}

/**
 * Create test registration
 */
export async function createTestRegistration(eventId: string, data?: Partial<{
  name: string
  email: string
  userId: string | null
  status: 'CONFIRMED' | 'WAITLISTED' | 'CANCELLED'
}>) {
  return prismaTest.registration.create({
    data: {
      eventId,
      name: data?.name || 'Test Attendee',
      email: data?.email || 'attendee@example.com',
      userId: data?.userId || null,
      status: data?.status || 'CONFIRMED',
      metadata: {}
    }
  })
}

/**
 * Database transaction helper for tests
 */
export async function withTransaction<T>(
  fn: (tx: PrismaClient) => Promise<T>
): Promise<T> {
  return prismaTest.$transaction(async (tx) => {
    return fn(tx as PrismaClient)
  })
}

/**
 * Wait for database connection
 */
export async function waitForDatabase(maxAttempts = 10): Promise<void> {
  let attempts = 0
  
  while (attempts < maxAttempts) {
    try {
      await prismaTest.$connect()
      return
    } catch (error) {
      attempts++
      if (attempts >= maxAttempts) {
        throw new Error('Could not connect to test database')
      }
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }
}

/**
 * Disconnect from database
 */
export async function disconnectDatabase(): Promise<void> {
  await prismaTest.$disconnect()
}