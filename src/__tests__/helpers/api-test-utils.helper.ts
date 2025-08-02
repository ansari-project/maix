/**
 * Test utilities for API routes using the HOF pattern
 */
import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth/next'

export interface MockUser {
  id: string
  email: string
  name: string
}

export interface MockSession {
  user: MockUser
}

/**
 * Creates a mock NextRequest with proper headers and authentication
 */
export function createMockRequest(
  method: string,
  url: string,
  body?: any,
  headers?: Record<string, string>
): NextRequest {
  const requestInit: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  }

  if (body && method !== 'GET') {
    requestInit.body = JSON.stringify(body)
  }

  return new NextRequest(url, requestInit)
}

/**
 * Mocks next-auth session and database user lookup for tests
 */
export function mockSession(user: MockUser | null) {
  const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>
  
  if (user) {
    mockGetServerSession.mockResolvedValue({
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })
  } else {
    mockGetServerSession.mockResolvedValue(null)
  }
}

/**
 * Creates a test user with default values
 */
export function createTestUser(overrides: Partial<MockUser> = {}): MockUser {
  return {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    ...overrides,
  }
}

/**
 * Helper to assert API response structure
 */
export function expectApiResponse(response: Response, expectedStatus: number) {
  expect(response.status).toBe(expectedStatus)
  expect(response.headers.get('content-type')).toContain('application/json')
}

/**
 * Helper to get JSON from response with proper typing
 */
export async function getResponseJson<T = any>(response: Response): Promise<T> {
  return response.json()
}