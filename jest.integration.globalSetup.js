/**
 * Global setup for integration tests
 * Runs once before all test suites
 */

module.exports = async () => {
  console.log('\n🔧 Setting up integration test environment...')
  
  // Set environment variables
  process.env.NODE_ENV = 'test'
  process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/maix_test'
  
  console.log('✅ Integration test environment ready\n')
}