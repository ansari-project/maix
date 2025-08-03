import { chromium, FullConfig } from '@playwright/test'
import { DatabaseHelper } from './helpers/db.helper'

async function globalSetup(config: FullConfig) {
  console.log('🧹 Cleaning up test database...')
  
  // Clean up any existing test data
  await DatabaseHelper.cleanup()
  
  // Set up test environment variables if needed
  // Note: NODE_ENV is read-only in production builds, but can be useful for local testing
  
  // You could also set up auth state here to reuse across tests
  // For example, create a logged-in user state and save it
  
  console.log('✅ Global setup complete')
}

export default globalSetup