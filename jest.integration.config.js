/**
 * Jest configuration for integration tests
 * Uses real test database instead of mocks
 * 
 * Optimizations:
 * - Removed Next.js compilation overhead (not needed for API tests)
 * - Reduced timeout from 30s to 10s
 * - Enabled parallel execution with 2 workers
 */

module.exports = {
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
  testTimeout: 10000, // Reduced from 30s - most DB operations should complete in 1-2s
  maxWorkers: 2, // Run 2 tests in parallel (was 1)
  globalSetup: '<rootDir>/jest.integration.globalSetup.js',
  globalTeardown: '<rootDir>/jest.integration.globalTeardown.js',
  
  // Transform TypeScript files without Next.js overhead
  transform: {
    '^.+\\.(t|j)sx?$': ['@swc/jest', {
      jsc: {
        parser: {
          syntax: 'typescript',
          tsx: true,
          decorators: false,
          dynamicImport: true,
        },
        transform: {
          react: {
            runtime: 'automatic',
          },
        },
        target: 'es2017',
      },
      module: {
        type: 'commonjs',
      },
    }],
  },
  
  // Ignore patterns
  transformIgnorePatterns: [
    '/node_modules/(?!(@dnd-kit|@radix-ui|@hookform|framer-motion)/)',
  ],
  
  // Add roots to speed up file discovery
  roots: ['<rootDir>/src'],
  
  // Disable coverage collection during normal test runs (speeds up tests)
  collectCoverage: false,
}