import pino from 'pino'

// Determine if we're in a browser environment
const isBrowser = typeof window !== 'undefined'

// Create base pino configuration
const pinoConfig = {
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'development' ? 'debug' : 'info'),
  // Base fields included in all logs
  base: {
    env: process.env.NODE_ENV,
    version: process.env.npm_package_version || '0.1.0'
  },
  // CRITICAL: Redact sensitive fields to prevent PII/secret leaks
  redact: {
    paths: [
      // HTTP headers that might contain secrets
      'req.headers.authorization',
      'req.headers.cookie',
      'req.headers["x-api-key"]',
      'res.headers["set-cookie"]',
      // Common sensitive field names anywhere in the log
      '*.password',
      '*.passwordHash',
      '*.token',
      '*.apiKey',
      '*.secret',
      '*.sessionId',
      '*.refreshToken',
      '*.accessToken',
      // Database connection strings
      '*.DATABASE_URL',
      '*.connectionString',
      // User PII
      '*.email', // Consider if you need emails in logs
      '*.phone',
      '*.ssn',
      '*.creditCard',
      '*.cvv',
      // Request/response bodies that might contain sensitive data
      'body.password',
      'body.token',
      'body.user.password',
      'body.user.passwordHash',
      // Maix-specific sensitive fields
      '*.ANTHROPIC_API_KEY',
      '*.GEMINI_API_KEY',
      '*.RESEND_API_KEY',
      '*.NEXTAUTH_SECRET',
      '*.AXIOM_TOKEN',
      '*.MAIX_PAT'
    ],
    censor: '[REDACTED]',
    remove: false // Keep the keys but censor the values
  }
}

// Create pino logger
const pinoLogger = pino(pinoConfig)

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
  private pino = pinoLogger

  // Ensure logs are flushed on serverless function end
  async flush() {
    // In production, logs are automatically sent to Vercel/Axiom
    // This method is kept for API compatibility
  }

  // Core logging methods with structured data
  debug(message: string, data?: Record<string, any>) {
    this.pino.debug(data, message)
    if (process.env.NODE_ENV === 'development' && !isBrowser) {
      formatDevLog('debug', message, data)
    }
  }

  info(message: string, data?: Record<string, any>) {
    this.pino.info(data, message)
    if (process.env.NODE_ENV === 'development' && !isBrowser) {
      formatDevLog('info', message, data)
    }
  }

  warn(message: string, data?: Record<string, any>) {
    this.pino.warn(data, message)
    if (process.env.NODE_ENV === 'development' && !isBrowser) {
      formatDevLog('warn', message, data)
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

    this.pino.error(errorData, message)
    if (process.env.NODE_ENV === 'development' && !isBrowser) {
      formatDevLog('error', message, errorData)
    }
  }

  // Child logger with additional context
  child(bindings: Record<string, any>) {
    const childPino = this.pino.child(bindings)
    const isDev = process.env.NODE_ENV === 'development' && !isBrowser
    
    return {
      debug: (message: string, data?: Record<string, any>) => {
        childPino.debug(data, message)
        if (isDev) {
          formatDevLog('debug', message, { ...bindings, ...data })
        }
      },
      info: (message: string, data?: Record<string, any>) => {
        childPino.info(data, message)
        if (isDev) {
          formatDevLog('info', message, { ...bindings, ...data })
        }
      },
      warn: (message: string, data?: Record<string, any>) => {
        childPino.warn(data, message)
        if (isDev) {
          formatDevLog('warn', message, { ...bindings, ...data })
        }
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

        childPino.error(errorData, message)
        if (isDev) {
          formatDevLog('error', message, { ...bindings, ...errorData })
        }
      },
      flush: async () => {
        // In production, logs are automatically sent to Vercel/Axiom
      }
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