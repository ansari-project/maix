import { test as base } from '@playwright/test'
import { AuthHelper } from './helpers/auth.helper'
import { DatabaseHelper, TestUserData } from './helpers/db.helper'

// Declare the types of fixtures
type MyFixtures = {
  authHelper: AuthHelper
  testUser: TestUserData
}

// Extend base test with our fixtures
export const test = base.extend<MyFixtures>({
  // Auth helper fixture
  authHelper: async ({ page }, use) => {
    const authHelper = new AuthHelper(page)
    await use(authHelper)
  },
  
  // Test user fixture - creates a user and cleans up after
  testUser: async ({}, use) => {
    // Create a unique test user
    const userData = {
      email: `test-${Date.now()}@test.com`,
      password: 'TestPassword123!',
      name: 'Test User'
    }
    
    const user = await DatabaseHelper.createTestUser(userData)
    
    // Use the test user
    await use(user)
    
    // Cleanup is handled by the global teardown
  }
})

export { expect } from '@playwright/test'