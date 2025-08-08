/**
 * Jest setup for integration tests
 */

// Set test environment
process.env.NODE_ENV = 'test'
process.env.IS_TEST_ENV = 'true'

// Increase timeout for database operations
jest.setTimeout(30000)

// Suppress console logs during tests unless debugging
if (!process.env.DEBUG) {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  }
}