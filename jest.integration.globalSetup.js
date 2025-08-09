/**
 * Global setup for integration tests
 * Runs once before all test suites
 */

const { setupTestDatabase } = require('./src/lib/test/db-test-utils.ts')
const { execSync } = require('child_process')

module.exports = async () => {
  console.log('\n🔧 Setting up integration test environment...')
  
  // Pre-flight checks
  console.log('📋 Running pre-flight checks...')
  
  // Check if Docker is running
  try {
    execSync('docker info', { stdio: 'ignore' })
    console.log('  ✅ Docker is running')
  } catch (error) {
    console.error('  ❌ Docker is not running!')
    console.error('     Please start Docker Desktop and try again.')
    process.exit(1)
  }
  
  // Check if test database container is running
  try {
    const result = execSync('docker ps | grep postgres-test || true', { encoding: 'utf8' })
    if (result.includes('postgres-test')) {
      console.log('  ✅ Test database container is running')
    } else {
      console.log('  ⚠️  Test database not running, starting it...')
      execSync('npm run test:db:start', { stdio: 'inherit' })
      // Wait for database to be ready
      await new Promise(resolve => setTimeout(resolve, 3000))
    }
  } catch (error) {
    console.warn('  ⚠️  Could not check test database status')
  }
  
  // Check for .env.test file
  const fs = require('fs')
  const path = require('path')
  const envTestPath = path.join(process.cwd(), '.env.test')
  
  if (fs.existsSync(envTestPath)) {
    console.log('  ✅ .env.test file found')
  } else {
    console.error('  ❌ .env.test file not found!')
    console.error('     Please copy .env.test.example to .env.test and configure it.')
    process.exit(1)
  }
  
  // Set environment variables
  process.env.NODE_ENV = 'test'
  process.env.IS_TEST_ENV = 'true'
  
  console.log('\n🗄️  INTEGRATION TEST MODE - Using test database on port 5433')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  
  // Setup test database with unique name and run migrations
  await setupTestDatabase()
  
  console.log('✅ Integration test environment ready\n')
}