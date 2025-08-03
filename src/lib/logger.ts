// Determine if we're in a browser environment
const isBrowser = typeof window !== 'undefined'

// Import next-axiom logger for production use
let axiomLog: any = null
if (!isBrowser && process.env.NODE_ENV === 'production') {
  try {
    // Use next-axiom's logger in production to avoid 4KB console.log limits
    axiomLog = require('next-axiom').log
  } catch {
    // next-axiom not available, use console as fallback
  }
}

// Base fields to include in all logs
const baseFields = {
  env: process.env.NODE_ENV,
  version: process.env.npm_package_version || '0.1.0'
}

// Format log for development console
const formatDevLog = (level: string, message: string, data?: Record<string, any>) => {
  if (process.env.NODE_ENV === 'development' && !isBrowser) {
    const colors = {
      debug: '\x1b[90m', // gray
      info: '\x1b[36m',  // cyan
      warn: '\x1b[33m',  // yellow
      error: '\x1b[31m'  // red
    }
    const color = colors[level as keyof typeof colors] || ''
    const reset = '\x1b[0m'
    const timestamp = new Date().toISOString().split('T')[1].slice(0, 8)
    
    console.log(`${color}[${timestamp}] ${level.toUpperCase()} ${message}${reset}`)
    if (data && Object.keys(data).length > 0) {
      console.log('  Data:', JSON.stringify(data, null, 2))
    }
  }
}

// Wrapper that provides convenience methods and development formatting
class Logger {
  // Core logging methods with structured data
  debug(message: string, data?: Record<string, any>) {
    const logData = { ...baseFields, ...data }
    
    if (axiomLog) {
      // Use next-axiom in production to avoid 4KB console.log limit
      axiomLog.debug(message, logData)
    } else if (process.env.NODE_ENV === 'development') {
      formatDevLog('debug', message, logData)
    } else {
      // Fallback to console in other environments
      console.debug(message, logData)
    }
  }

  info(message: string, data?: Record<string, any>) {
    const logData = { ...baseFields, ...data }
    
    if (axiomLog) {
      // Use next-axiom in production to avoid 4KB console.log limit
      axiomLog.info(message, logData)
    } else if (process.env.NODE_ENV === 'development') {
      formatDevLog('info', message, logData)
    } else {
      // Fallback to console in other environments
      console.info(message, logData)
    }
  }

  warn(message: string, data?: Record<string, any>) {
    const logData = { ...baseFields, ...data }
    
    if (axiomLog) {
      // Use next-axiom in production to avoid 4KB console.log limit
      axiomLog.warn(message, logData)
    } else if (process.env.NODE_ENV === 'development') {
      formatDevLog('warn', message, logData)
    } else {
      // Fallback to console in other environments
      console.warn(message, logData)
    }
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
    
    const logData = { ...baseFields, ...errorData }

    if (axiomLog) {
      // Use next-axiom in production to avoid 4KB console.log limit
      axiomLog.error(message, logData)
    } else if (process.env.NODE_ENV === 'development') {
      formatDevLog('error', message, logData)
    } else {
      // Fallback to console in other environments
      console.error(message, logData)
    }
  }

  // Child logger with additional context
  child(bindings: Record<string, any>) {
    const mergedFields = { ...baseFields, ...bindings }
    
    return {
      debug: (message: string, data?: Record<string, any>) => {
        this.debug(message, { ...mergedFields, ...data })
      },
      info: (message: string, data?: Record<string, any>) => {
        this.info(message, { ...mergedFields, ...data })
      },
      warn: (message: string, data?: Record<string, any>) => {
        this.warn(message, { ...mergedFields, ...data })
      },
      error: (message: string, error?: Error | unknown, data?: Record<string, any>) => {
        this.error(message, error, { ...mergedFields, ...data })
      },
      flush: async () => {
        // In production, logs are automatically sent to Axiom
        if (axiomLog && axiomLog.flush) {
          await axiomLog.flush()
        }
      }
    }
  }

  // Ensure logs are flushed on serverless function end
  async flush() {
    // In production, logs are automatically sent to Axiom
    if (axiomLog && axiomLog.flush) {
      await axiomLog.flush()
    }
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