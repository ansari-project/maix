# Integration Testing Guide

## Overview

This guide covers the integration testing setup for the Maix project, which uses a real test database instead of mocks to ensure proper system behavior.

## Why Integration Testing?

Unit tests with mocks can give false confidence. Issues we've encountered that mocks didn't catch:
- Schema mismatches (e.g., Todo model field names)
- Database constraint violations
- Transaction rollback behavior
- Cascade delete operations
- Real query performance

## Setup

### 1. Create Test Database

Create a separate PostgreSQL database for testing:

```sql
CREATE DATABASE maix_test;
```

### 2. Configure Environment

Copy `.env.test.example` to `.env.test` and configure:

```bash
cp .env.test.example .env.test
```

Edit `.env.test`:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/maix_test"
```

### 3. Run Integration Tests

```bash
# Run all integration tests
npm run test:integration

# Watch mode for development
npm run test:integration:watch

# Run both unit and integration tests
npm run test:all
```

## Writing Integration Tests

### Basic Structure

```typescript
import {
  setupTestDatabase,
  cleanupTestDatabase,
  createTestUser,
  createTestOrganization,
  prismaTest,
  waitForDatabase,
  disconnectDatabase
} from '@/lib/test/db-test-utils'

describe('Service Integration Tests', () => {
  beforeAll(async () => {
    await waitForDatabase()
    await setupTestDatabase()
  })

  beforeEach(async () => {
    await cleanupTestDatabase()
    // Create test data
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  it('should perform real database operations', async () => {
    // Test with actual database
  })
})
```

### Test Utilities

The `db-test-utils.ts` file provides helpers:

- `setupTestDatabase()` - Creates schema and runs migrations
- `cleanupTestDatabase()` - Truncates all tables
- `createTestUser()` - Creates a test user
- `createTestOrganization()` - Creates a test organization
- `createTestEvent()` - Creates a test event
- `createTestRegistration()` - Creates a test registration
- `prismaTest` - Prisma client instance for tests

### Best Practices

1. **Clean State**: Always clean the database before each test
2. **Isolation**: Tests should not depend on each other
3. **Real Constraints**: Test actual database constraints and cascades
4. **Transaction Testing**: Verify rollback behavior on errors
5. **Performance**: Keep test data minimal for speed

## Migration from Mocked Tests

### Before (Mocked)
```typescript
jest.mock('@/lib/services/event.service')

it('should create event', async () => {
  (createEvent as jest.Mock).mockResolvedValue(mockEvent)
  // Test with mock
})
```

### After (Integration)
```typescript
it('should create event in database', async () => {
  const event = await createEvent(userId, eventData)
  
  // Verify in actual database
  const inDb = await prismaTest.maixEvent.findUnique({
    where: { id: event.id }
  })
  expect(inDb).toBeTruthy()
})
```

## Test Database Management

### Reset Test Database
```bash
# Warning: This destroys all test data
npx prisma migrate reset --skip-seed
```

### View Test Database
```bash
# Connect to test database with Prisma Studio
DATABASE_URL="postgresql://..." npx prisma studio
```

## CI/CD Integration

For GitHub Actions or other CI systems:

```yaml
services:
  postgres:
    image: postgres:15
    env:
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: maix_test
    options: >-
      --health-cmd pg_isready
      --health-interval 10s
      --health-timeout 5s
      --health-retries 5

steps:
  - name: Setup Database
    run: npx prisma migrate deploy
    env:
      DATABASE_URL: postgresql://postgres:postgres@localhost:5432/maix_test
  
  - name: Run Integration Tests
    run: npm run test:integration
```

## Troubleshooting

### Connection Issues
- Ensure PostgreSQL is running
- Check DATABASE_URL in .env.test
- Verify database exists

### Migration Errors
- Run `npx prisma migrate deploy` to apply migrations
- Check for pending migrations with `npx prisma migrate status`

### Slow Tests
- Reduce test data size
- Use `beforeAll` for expensive setup
- Run tests in parallel when possible

## Coverage Goals

Target coverage for integration tests:
- Service layer: 80%+
- API routes: 70%+
- Critical paths: 100%
- Edge cases: 60%+

## Next Steps

1. Convert remaining mocked tests to integration tests
2. Add performance benchmarks
3. Implement test data factories
4. Add API endpoint integration tests
5. Create E2E test suite with Playwright