import { logger } from '../logger'
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'

describe('logger', () => {
  let mockConsoleLog: jest.SpyInstance
  let mockConsoleWarn: jest.SpyInstance

  beforeEach(() => {
    jest.clearAllMocks()
    mockConsoleLog = jest.spyOn(console, 'log').mockImplementation()
    mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation()
  })

  afterEach(() => {
    mockConsoleLog.mockRestore()
    mockConsoleWarn.mockRestore()
  })

  describe('logger interface', () => {
    it('should have all expected logging methods', () => {
      expect(logger.debug).toBeDefined()
      expect(logger.info).toBeDefined()
      expect(logger.warn).toBeDefined()
      expect(logger.error).toBeDefined()
      expect(logger.child).toBeDefined()
      expect(logger.flush).toBeDefined()
    })

    it('should have all convenience methods', () => {
      expect(logger.authLogin).toBeDefined()
      expect(logger.authFailed).toBeDefined()
      expect(logger.apiRequest).toBeDefined()
      expect(logger.apiResponse).toBeDefined()
      expect(logger.dbQuery).toBeDefined()
      expect(logger.dbError).toBeDefined()
    })
  })

  describe('core logging methods', () => {
    it('should accept debug messages with data', () => {
      expect(() => logger.debug('Debug message', { key: 'value' })).not.toThrow()
    })

    it('should accept info messages with data', () => {
      expect(() => logger.info('Info message', { userId: '123' })).not.toThrow()
    })

    it('should accept warning messages with data', () => {
      expect(() => logger.warn('Warning message', { error: 'potential issue' })).not.toThrow()
    })

    it('should accept error messages with Error objects', () => {
      const testError = new Error('Test error')
      expect(() => logger.error('Error occurred', testError, { context: 'test' })).not.toThrow()
    })

    it('should accept error messages without Error objects', () => {
      expect(() => logger.error('Error occurred', undefined, { context: 'test' })).not.toThrow()
    })
  })

  describe('child logger', () => {
    it('should create child logger with bindings', () => {
      const childLogger = logger.child({ requestId: 'abc123' })
      expect(childLogger).toBeDefined()
      expect(childLogger.debug).toBeDefined()
      expect(childLogger.info).toBeDefined()
      expect(childLogger.warn).toBeDefined()
      expect(childLogger.error).toBeDefined()
    })

    it('should accept logs from child logger', () => {
      const childLogger = logger.child({ requestId: 'abc123' })
      expect(() => childLogger.info('Child log message', { status: 'success' })).not.toThrow()
    })
  })

  describe('convenience methods', () => {
    it('should log authentication success', () => {
      expect(() => logger.authLogin('user-123', 'test@example.com')).not.toThrow()
    })

    it('should log authentication failure', () => {
      expect(() => logger.authFailed('test@example.com', 'invalid credentials')).not.toThrow()
    })

    it('should log API requests', () => {
      expect(() => logger.apiRequest('GET', '/api/users', 'user-123')).not.toThrow()
    })

    it('should log API responses', () => {
      expect(() => {
        logger.apiResponse('GET', '/api/users', 200, 150)
        logger.apiResponse('POST', '/api/users', 400, 50)
        logger.apiResponse('DELETE', '/api/users/123', 500, 200)
      }).not.toThrow()
    })

    it('should log database queries', () => {
      expect(() => logger.dbQuery('SELECT', 'users', 25)).not.toThrow()
    })

    it('should log database errors', () => {
      const dbError = new Error('Connection failed')
      expect(() => logger.dbError('INSERT', dbError, { table: 'posts' })).not.toThrow()
    })
  })

  describe('development formatting', () => {
    it('should format logs in development mode', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      // Since we can't easily mock the internal pino instance,
      // we'll just verify the console output in dev mode
      mockConsoleLog.mockClear()
      logger.info('Test message', { data: 'value' })

      // In development, formatDevLog should be called
      if (!('window' in global)) {
        expect(mockConsoleLog).toHaveBeenCalled()
      }

      process.env.NODE_ENV = originalEnv
    })
  })

  describe('flush method', () => {
    it('should have a flush method for API compatibility', async () => {
      expect(logger.flush).toBeDefined()
      await expect(logger.flush()).resolves.toBeUndefined()
    })

    it('child logger should have flush method', async () => {
      const childLogger = logger.child({ context: 'test' })
      expect(childLogger.flush).toBeDefined()
      await expect(childLogger.flush()).resolves.toBeUndefined()
    })
  })

  describe('configuration validation', () => {
    it('should handle logging in production environment', () => {
      // The logger should work in production environment
      const originalEnv = process.env.NODE_ENV
      
      process.env.NODE_ENV = 'production'

      // Logger should still work
      expect(() => logger.info('Test in production')).not.toThrow()

      // Restore env vars
      process.env.NODE_ENV = originalEnv
    })
  })
})