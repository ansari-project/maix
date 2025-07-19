/**
 * Test utilities for mocking authentication and API utilities across test files
 * This file provides consistent mocking patterns for the new authentication and API utils
 */

import { NextResponse } from 'next/server'

// Import actual modules - these will be mocked by test files before importing this module
import { requireAuth } from '@/lib/auth-utils'
import { handleApiError, parseRequestBody, successResponse } from '@/lib/api-utils'

// Export mocked versions for tests
// Note: Tests must mock the modules before importing this file
export const mockRequireAuth = requireAuth as any
export const mockHandleApiError = handleApiError as any
export const mockParseRequestBody = parseRequestBody as any
export const mockSuccessResponse = successResponse as any

// Standard test user
export const mockUser = {
  id: 'user-123',
  email: 'john@example.com',
  name: 'John Doe',
  bio: null,
  specialty: null,
  experienceLevel: null,
  skills: [],
  linkedinUrl: null,
  githubUrl: null,
  portfolioUrl: null,
  availability: null,
  timezone: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

// Helper to mock successful authentication
export const mockAuthenticatedUser = () => {
  mockRequireAuth.mockResolvedValue(mockUser)
}

// Helper to mock authentication failure
export const mockAuthenticationFailure = (errorMessage = 'Not authenticated') => {
  const authError = new Error(errorMessage)
  authError.name = 'AuthError'
  mockRequireAuth.mockRejectedValue(authError)
}

// Helper to mock API error responses
export const mockApiErrorResponse = (message: string, status: number) => {
  return NextResponse.json({ message }, { status })
}

// Helper to mock success responses  
export const mockApiSuccessResponse = (data: any, status = 200) => {
  return NextResponse.json(data, { status })
}

// Reset all mocks but keep default implementations
export const resetTestMocks = () => {
  // Only available in test environment
  if (typeof (global as any).jest !== 'undefined') {
    (global as any).jest.clearAllMocks()
    // Set up default implementations
    if (mockHandleApiError.mockImplementation) {
      mockHandleApiError.mockImplementation((error: any, context?: string) => 
        NextResponse.json({ message: 'Internal server error' }, { status: 500 })
      )
    }
    if (mockSuccessResponse.mockImplementation) {
      mockSuccessResponse.mockImplementation((data: any, status = 200) => 
        NextResponse.json(data, { status })
      )
    }
  }
}