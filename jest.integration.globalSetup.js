/**
 * Global setup for integration tests
 * Runs once before all test suites
 */

const { setupTestDatabase } = require('./src/lib/test/db-test-utils.ts')

module.exports = async () => {
  console.log('\n🔧 Setting up integration test environment...')
  
  // Set environment variables
  process.env.NODE_ENV = 'test'
  process.env.IS_TEST_ENV = 'true'
  
  // Setup test database with unique name and run migrations
  await setupTestDatabase()
  
  console.log('✅ Integration test environment ready\n')
}