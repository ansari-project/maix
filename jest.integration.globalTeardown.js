/**
 * Global teardown for integration tests
 * Runs once after all test suites
 */

module.exports = async () => {
  console.log('\n🧹 Cleaning up integration test environment...')
  // Any global cleanup can go here
  console.log('✅ Cleanup complete\n')
}