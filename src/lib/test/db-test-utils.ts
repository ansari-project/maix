/**
 * Database Test Utilities
 * Provides helpers for integration testing with a real test database
 */

import { PrismaClient } from '@prisma/client'
import { execSync } from 'child_process'
import * as dotenv from 'dotenv'
import * as path from 'path'
import * as fs from 'fs'

// Load test environment variables FIRST
const testEnvPath = path.join(process.cwd(), '.env.test')
if (fs.existsSync(testEnvPath)) {
  dotenv.config({ path: testEnvPath })
} else {
  console.warn('⚠️  .env.test not found. Using default test configuration.')
}

// Store the database name and client once they're generated
let testDbName: string | null = null
let _prismaTest: PrismaClient | null = null

// Create or get the test Prisma client
export function getPrismaTest(): PrismaClient {
  if (!_prismaTest) {
    _prismaTest = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL
        }
      },
      log: process.env.DEBUG ? ['query', 'error', 'warn'] : ['error']
    })
  }
  return _prismaTest
}

// Export for backward compatibility
export const prismaTest = new Proxy({} as PrismaClient, {
  get(target, prop) {
    return getPrismaTest()[prop as keyof PrismaClient]
  }
})

/**
 * Setup test database
 * Creates a unique database for this test run and runs migrations
 */
export async function setupTestDatabase(): Promise<void> {
  try {
    if (process.env.CI) {
      // In CI, use the provided DATABASE_URL as-is
      // In CI, database already exists - use db push to create schema
      console.log('🔧 CI Environment: Creating schema on existing database')
      
      // Disconnect all clients
      await getPrismaTest().$disconnect()
      
      // Use db push for CI as well - creates schema from scratch
      execSync('npx prisma db push --skip-generate --accept-data-loss', {
        env: {
          ...process.env,
          DATABASE_URL: process.env.DATABASE_URL
        }
      })
      
      // Reconnect after migrations
      await getPrismaTest().$connect()
      
      console.log('✅ CI test database ready')
    } else {
      // Local environment - create unique database
      // Generate name only once per test run
      if (!testDbName) {
        const testDbSuffix = Math.random().toString(36).substring(7)
        testDbName = `maix_test_${testDbSuffix}`
        process.env.DATABASE_URL = `postgresql://testuser:testpass@localhost:5433/${testDbName}`
        
        // Reset the client so it uses the new URL
        if (_prismaTest) {
          await _prismaTest.$disconnect()
          _prismaTest = null
        }
      }
      
      console.log(`🔧 Setting up test database: ${testDbName}`)
      
      // Disconnect all clients
      await getPrismaTest().$disconnect()
      
      // Drop if exists and create fresh
      // Each test gets its own database for isolation
      try {
        execSync(`PGPASSWORD=testpass psql -U testuser -h localhost -p 5433 -d postgres -c "DROP DATABASE IF EXISTS ${testDbName};"`, {
          stdio: 'pipe'
        })
      } catch (e) {
        // Ignore errors from drop
      }
      
      execSync(`PGPASSWORD=testpass psql -U testuser -h localhost -p 5433 -d postgres -c "CREATE DATABASE ${testDbName};"`, {
        stdio: 'pipe'
      })
      
      // Use db push for test database - creates schema from scratch without migrations
      console.log(`Applying schema to database with URL: ${process.env.DATABASE_URL}`)
      execSync('npx prisma db push --skip-generate --accept-data-loss', {
        env: {
          ...process.env,
          DATABASE_URL: process.env.DATABASE_URL // Use the new unique database URL
        },
        stdio: process.env.DEBUG ? 'inherit' : 'pipe'
      })
      
      // Reconnect after database creation
      await getPrismaTest().$connect()
      
      console.log(`✅ Test database ready: ${testDbName}`)
    }
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
  try {
    // SAFETY CHECK: Only allow this on local test database
    const dbUrl = process.env.DATABASE_URL
    if (!dbUrl || dbUrl.includes('neon.tech') || dbUrl.includes('production')) {
      throw new Error('SAFETY: Cannot run cleanup against production database!')
    }
    
    // Check if tables exist first
    const result = await prismaTest.$queryRaw<Array<{table_name: string}>>`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    `
    
    if (result.length === 0) {
      console.log('⚠️  No tables found to clean up')
      return
    }
    
    // Disable foreign key checks temporarily
    await prismaTest.$executeRawUnsafe('SET session_replication_role = replica;')
    
    // Truncate all existing tables
    for (const row of result) {
      try {
        await prismaTest.$executeRawUnsafe(`TRUNCATE TABLE "${row.table_name}" CASCADE;`)
      } catch (err) {
        // If table doesn't exist, continue
        console.warn(`Could not truncate ${row.table_name}, continuing...`)
      }
    }
    
    // Re-enable foreign key checks
    await prismaTest.$executeRawUnsafe('SET session_replication_role = DEFAULT;')
  } catch (error) {
    console.error('Failed to cleanup database:', error)
    // Don't throw if cleanup fails - might be first run
  }
}

/**
 * Create test user
 */
let userCounter = 0

export async function createTestUser(data?: Partial<{
  email: string
  name: string
  username: string
}>) {
  userCounter++
  const uniqueSuffix = `${Date.now()}_${userCounter}_${Math.random().toString(36).substring(7)}`
  
  return prismaTest.user.create({
    data: {
      email: data?.email || `test_${uniqueSuffix}@example.com`,
      name: data?.name || 'Test User',
      username: data?.username || `testuser_${uniqueSuffix}`,
      password: 'hashed_password', // In real tests, use proper hashing
    }
  })
}

/**
 * Create test organization
 */
let orgCounter = 0

export async function createTestOrganization(ownerId: string, data?: Partial<{
  name: string
  slug: string
}>) {
  orgCounter++
  const uniqueSuffix = `${Date.now()}_${orgCounter}_${Math.random().toString(36).substring(7)}`
  
  return prismaTest.organization.create({
    data: {
      name: data?.name || 'Test Organization',
      slug: data?.slug || `test-org-${uniqueSuffix}`,
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
      await getPrismaTest().$connect()
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
  if (_prismaTest) {
    await _prismaTest.$disconnect()
    _prismaTest = null
  }
  // Don't drop the database - it will be reused for next test run
}