/**
 * Jest configuration for integration tests
 * Uses real test database instead of mocks
 */

const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  displayName: 'integration',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/jest.integration.setup.js'],
  testMatch: [
    '**/*.integration.test.ts',
    '**/*.integration.test.tsx',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testTimeout: 30000, // Longer timeout for database operations
  maxWorkers: 1, // Run tests sequentially to avoid database conflicts
  globalSetup: '<rootDir>/jest.integration.globalSetup.js',
  globalTeardown: '<rootDir>/jest.integration.globalTeardown.js',
}

module.exports = createJestConfig(customJestConfig)