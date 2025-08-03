import { FullConfig } from '@playwright/test'
import { DatabaseHelper } from './helpers/db.helper'

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Running global teardown...')
  
  // Clean up all test data
  await DatabaseHelper.cleanup()
  
  // Disconnect from database
  await DatabaseHelper.disconnect()
  
  console.log('✅ Global teardown complete')
}

export default globalTeardown