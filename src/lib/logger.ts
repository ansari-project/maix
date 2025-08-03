// Simple logger that uses console methods
// Vercel automatically captures console output

// Base fields to include in all logs
const baseFields = {
  env: process.env.NODE_ENV,
  version: process.env.npm_package_version || '0.1.0'
}

// Simple logger wrapper around console
class Logger {
  // Core logging methods with structured data
  debug(message: string, data?: Record<string, any>) {
    console.debug(message, { ...baseFields, ...data })
  }

  info(message: string, data?: Record<string, any>) {
    console.info(message, { ...baseFields, ...data })
  }

  warn(message: string, data?: Record<string, any>) {
    console.warn(message, { ...baseFields, ...data })
  }

  error(message: string, error?: Error | unknown, data?: Record<string, any>) {
    const errorData = error instanceof Error ? {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      ...data
    } : data
    
    console.error(message, { ...baseFields, ...errorData })
  }

  // Child logger with additional context
  child(bindings: Record<string, any>) {
    const mergedFields = { ...baseFields, ...bindings }
    
    return {
      debug: (message: string, data?: Record<string, any>) => {
        console.debug(message, { ...mergedFields, ...data })
      },
      info: (message: string, data?: Record<string, any>) => {
        console.info(message, { ...mergedFields, ...data })
      },
      warn: (message: string, data?: Record<string, any>) => {
        console.warn(message, { ...mergedFields, ...data })
      },
      error: (message: string, error?: Error | unknown, data?: Record<string, any>) => {
        const errorData = error instanceof Error ? {
          error: {
            name: error.name,
            message: error.message,
            stack: error.stack
          },
          ...data
        } : data
        console.error(message, { ...mergedFields, ...errorData })
      },
      flush: async () => {
        // No-op for console logging
      }
    }
  }

  // No-op flush for console logging
  async flush() {
    // Console logs are automatically captured by Vercel
  }

  // Convenience methods for common scenarios
  
  // Authentication logging
  authLogin(userId: string, email: string) {
    this.info('User logged in', { event: 'auth.login', userId, email })
  }

  authFailed(email: string, reason: string) {
    this.warn('Authentication failed', { event: 'auth.failed', email, reason })
  }

  // API logging
  apiRequest(method: string, path: string, userId?: string) {
    this.info('API request', { event: 'api.request', method, path, userId })
  }

  apiResponse(method: string, path: string, statusCode: number, duration: number) {
    const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info'
    this[level]('API response', { 
      event: 'api.response', 
      method, 
      path, 
      statusCode, 
      duration 
    })
  }

  // Database logging
  dbQuery(operation: string, table: string, duration?: number) {
    this.debug('Database query', { event: 'db.query', operation, table, duration })
  }

  dbError(operation: string, error: Error, metadata?: Record<string, any>) {
    this.error('Database error', error, { 
      event: 'db.error', 
      operation, 
      ...metadata 
    })
  }
}

// Export singleton instance
export const logger = new Logger()

// Export type for request logger middleware
export interface RequestLogger {
  debug: (message: string, data?: Record<string, any>) => void
  info: (message: string, data?: Record<string, any>) => void
  warn: (message: string, data?: Record<string, any>) => void
  error: (message: string, error?: Error | unknown, data?: Record<string, any>) => void
  flush: () => Promise<void>
}