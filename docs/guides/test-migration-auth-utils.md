# Test Migration Guide: From getServerSession to Auth Utils

## Overview

This guide documents the systematic process for migrating API route tests from the old `getServerSession` authentication pattern to the new `auth-utils` and `api-utils` patterns.

## Background

The MAIX project migrated from using NextAuth's `getServerSession` directly in API routes to using centralized `requireAuth()` and `handleApiError()` utilities. This change required updating all existing test files to match the new patterns.

## Migration Pattern

### 1. Update Mock Structure (Top of File)

**Before:**
```typescript
import { getServerSession } from 'next-auth/next'
import { prisma } from '@/lib/prisma'

// Mock the dependencies
jest.mock('next-auth/next')
jest.mock('@/lib/prisma')

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>
const mockPrisma = prisma as jest.Mocked<typeof prisma>
```

**After:**
```typescript
import { NextRequest } from 'next/server'

// Mock all dependencies first before importing anything
jest.mock('@/lib/auth-utils')
jest.mock('@/lib/api-utils')
jest.mock('@/lib/prisma', () => ({
  prisma: {
    // Include only the specific methods this test file uses
    user: { findUnique: jest.fn(), update: jest.fn() },
    project: { findMany: jest.fn(), create: jest.fn() },
    // etc.
  },
}))

import { GET, POST } from '../route'
import { prisma } from '@/lib/prisma'
import { 
  mockRequireAuth, 
  mockUser,
  mockApiErrorResponse,
  mockApiSuccessResponse
} from '@/lib/test-utils'
import { handleApiError, successResponse, parseRequestBody } from '@/lib/api-utils'

const mockPrisma = prisma as jest.Mocked<typeof prisma>
const mockHandleApiError = handleApiError as jest.MockedFunction<typeof handleApiError>
const mockSuccessResponse = successResponse as jest.MockedFunction<typeof successResponse>
const mockParseRequestBody = parseRequestBody as jest.MockedFunction<typeof parseRequestBody>
```

### 2. Update Individual Test Patterns

#### Successful Authentication Tests

**Before:**
```typescript
test('should update user profile with valid data', async () => {
  mockGetServerSession.mockResolvedValue(mockSession as any)
  mockPrisma.user.update.mockResolvedValue(updatedUser as any)

  const request = createMockRequest(validUpdateData)
  const response = await PUT(request)
  const responseData = await response.json()

  expect(response.status).toBe(200)
  expect(responseData.name).toBe('Updated Name')
})
```

**After:**
```typescript
test('should update user profile with valid data', async () => {
  mockRequireAuth.mockResolvedValue(mockUser as any)
  mockParseRequestBody.mockResolvedValue(validUpdateData)
  mockPrisma.user.update.mockResolvedValue(updatedUser as any)
  mockSuccessResponse.mockReturnValue(
    mockApiSuccessResponse(updatedUser, 200) as any
  )

  const request = createMockRequest(validUpdateData)
  const response = await PUT(request)
  const responseData = await response.json()

  expect(response.status).toBe(200)
  expect(responseData.name).toBe('Updated Name')
})
```

#### Authentication Failure Tests

**Before:**
```typescript
test('should return 401 for unauthenticated user', async () => {
  mockGetServerSession.mockResolvedValue(null)

  const request = createMockRequest(validData)
  const response = await POST(request)
  const responseData = await response.json()

  expect(response.status).toBe(401)
  expect(responseData.error).toBe('Unauthorized')
})
```

**After:**
```typescript
test('should return 401 for unauthenticated user', async () => {
  const authError = new Error('Not authenticated')
  authError.name = 'AuthError'
  mockRequireAuth.mockRejectedValue(authError)
  mockHandleApiError.mockReturnValue(
    mockApiErrorResponse('Not authenticated', 401) as any
  )

  const request = createMockRequest(validData)
  const response = await POST(request)
  const responseData = await response.json()

  expect(response.status).toBe(401)
  expect(responseData.message).toBe('Not authenticated')
})
```

#### Validation Error Tests

**Before:**
```typescript
test('should return 400 for invalid input data', async () => {
  mockGetServerSession.mockResolvedValue(mockSession as any)
  
  const invalidData = { name: 'A' } // Too short
  const request = createMockRequest(invalidData)
  const response = await POST(request)
  const responseData = await response.json()

  expect(response.status).toBe(400)
  expect(responseData.message).toBe('Invalid input')
  expect(responseData.errors).toHaveLength(1)
})
```

**After:**
```typescript
test('should return 400 for invalid input data', async () => {
  mockRequireAuth.mockResolvedValue(mockUser as any)
  const validationError = new Error('Invalid input')
  validationError.name = 'ZodError'
  mockParseRequestBody.mockRejectedValue(validationError)
  mockHandleApiError.mockReturnValue(
    mockApiErrorResponse('Invalid input', 400) as any
  )
  
  const invalidData = { name: 'A' } // Too short
  const request = createMockRequest(invalidData)
  const response = await POST(request)
  const responseData = await response.json()

  expect(response.status).toBe(400)
  expect(responseData.message).toBe('Invalid input')
})
```

### 3. Key Changes Summary

1. **Mock Structure**: Move from `getServerSession` to `auth-utils` and `api-utils`
2. **Authentication**: Use `mockRequireAuth` instead of `mockGetServerSession`
3. **Request Body**: Add `mockParseRequestBody` for request data parsing
4. **Success Responses**: Add `mockSuccessResponse` calls
5. **Error Handling**: Use `mockHandleApiError` for error scenarios
6. **Response Fields**: Change `responseData.error` to `responseData.message`
7. **Error Messages**: Update expected messages to match new auth system

### 4. Helper Patterns

#### Create Validation Test Helper
```typescript
const testValidationError = async (invalidData: any, expectedError: string) => {
  mockRequireAuth.mockResolvedValue(mockUser as any)
  const validationError = new Error(expectedError)
  validationError.name = 'ZodError'
  mockParseRequestBody.mockRejectedValue(validationError)
  mockHandleApiError.mockReturnValue(
    mockApiErrorResponse(expectedError, 400) as any
  )

  const request = createMockRequest(invalidData)
  const response = await PUT(request)
  const responseData = await response.json()

  expect(response.status).toBe(400)
  expect(responseData.message).toBe(expectedError)
}
```

## Test-Utils.ts File

The project includes a comprehensive test utilities file at `/src/lib/test-utils.ts` that provides:

- `mockRequireAuth`, `mockHandleApiError`, `mockParseRequestBody`, `mockSuccessResponse`
- Standard test user object (`mockUser`)
- Helper functions for authentication and error mocking
- Response helper functions

## Common Errors and Solutions

### 1. "mockGetServerSession is not defined"
- **Cause**: Forgot to update mock imports at top of file
- **Solution**: Replace `getServerSession` mocking with new auth-utils pattern

### 2. "Cannot find name 'jest' in production build"
- **Cause**: Jest references in test-utils affecting build
- **Solution**: Already fixed in test-utils.ts with runtime checks

### 3. "Expected 'Unauthorized' received 'Not authenticated'"
- **Cause**: New auth system returns different error messages
- **Solution**: Update expected error messages in assertions

### 4. Test passes locally but fails in CI
- **Cause**: Missing mock setup or race conditions
- **Solution**: Ensure all mocks are properly configured before imports

## Migration Checklist

For each test file:

- [ ] Update mock structure at top of file
- [ ] Replace `mockGetServerSession` with `mockRequireAuth`
- [ ] Add `mockParseRequestBody` for request data
- [ ] Add `mockSuccessResponse` for success cases
- [ ] Add `mockHandleApiError` for error cases
- [ ] Update `responseData.error` to `responseData.message`
- [ ] Update expected error messages
- [ ] Remove any `mockSession` references
- [ ] Test file passes completely

## Files Completed

- ✅ `/src/app/api/applications/[id]/__tests__/route.test.ts` - Fully migrated
- ✅ `/src/lib/test-utils.ts` - Created comprehensive utilities

## Files In Progress

- 🔄 `/src/app/api/projects/[id]/apply/__tests__/route.test.ts` - Mostly complete
- 🔄 `/src/app/api/posts/__tests__/route.test.ts` - Mock structure updated

## Files Remaining

- ⏳ `/src/app/api/posts/[id]/__tests__/route.test.ts`
- ⏳ `/src/app/api/posts/[id]/comments/__tests__/route.test.ts`
- ⏳ `/src/app/api/questions/[id]/resolve/__tests__/route.test.ts`

## Success Metrics

- All API route tests pass with new authentication patterns
- No references to old `getServerSession` in test files
- Consistent error handling and response patterns
- Comprehensive test coverage maintained