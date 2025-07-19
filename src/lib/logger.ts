import { NextRequest } from 'next/server'

// Log levels
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug'
}

// Essential log event types for MVP (following MAIX principle of iterative complexity)
export enum LogEvent {
  // Authentication events (essential for security)
  AUTH_LOGIN = 'auth.login',
  AUTH_FAILED = 'auth.failed',
  
  // Content moderation events (business requirement)
  CONTENT_MODERATION = 'content.moderation',
  
  // API events (essential for debugging)
  API_ERROR = 'api.error',
  
  // Database events (essential for debugging)
  DB_ERROR = 'db.error',
  
  // TODO: Add more event types as needed (iterative complexity):
  // - USER_CREATED, PROJECT_CREATED when we need user analytics
  // - SECURITY_UNAUTHORIZED when we need security monitoring  
  // - DB_QUERY_SLOW when we observe performance issues
}

// Base log entry structure
interface BaseLogEntry {
  timestamp: string
  level: LogLevel
  event: LogEvent
  message: string
  environment: string
  version?: string
}

// Extended log entry with optional context
interface LogEntry extends BaseLogEntry {
  userId?: string
  sessionId?: string
  requestId?: string
  userAgent?: string
  ip?: string
  path?: string
  method?: string
  statusCode?: number
  duration?: number
  error?: {
    name: string
    message: string
    stack?: string
  }
  metadata?: Record<string, any>
}

class Logger {
  private environment: string
  private version: string

  constructor() {
    this.environment = process.env.NODE_ENV || 'development'
    this.version = process.env.npm_package_version || '0.1.0'
  }

  private createBaseEntry(level: LogLevel, event: LogEvent, message: string): BaseLogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      event,
      message,
      environment: this.environment,
      version: this.version
    }
  }

  private log(entry: LogEntry) {
    // In development, use console with formatted output
    if (this.environment === 'development') {
      const color = this.getColorForLevel(entry.level)
      console.log(
        `${color}[${entry.timestamp}] ${entry.level.toUpperCase()} ${entry.event}${'\x1b[0m'}`
      )
      console.log(`  Message: ${entry.message}`)
      if (entry.userId) console.log(`  User: ${entry.userId}`)
      if (entry.path) console.log(`  Path: ${entry.method} ${entry.path}`)
      if (entry.statusCode) console.log(`  Status: ${entry.statusCode}`)
      if (entry.duration) console.log(`  Duration: ${entry.duration}ms`)
      if (entry.error) {
        console.log(`  Error: ${entry.error.name}: ${entry.error.message}`)
        if (entry.error.stack) console.log(`  Stack: ${entry.error.stack}`)
      }
      if (entry.metadata) console.log(`  Metadata:`, entry.metadata)
      console.log('') // Empty line for readability
    } else {
      // In production, output structured JSON for log aggregation
      console.log(JSON.stringify(entry))
    }
  }

  private getColorForLevel(level: LogLevel): string {
    switch (level) {
      case LogLevel.ERROR: return '\x1b[31m' // Red
      case LogLevel.WARN: return '\x1b[33m'  // Yellow
      case LogLevel.INFO: return '\x1b[36m'  // Cyan
      case LogLevel.DEBUG: return '\x1b[90m' // Gray
      default: return '\x1b[0m'
    }
  }

  // Core logging methods
  error(event: LogEvent, message: string, context?: Partial<LogEntry>) {
    this.log({
      ...this.createBaseEntry(LogLevel.ERROR, event, message),
      ...context
    })
  }

  warn(event: LogEvent, message: string, context?: Partial<LogEntry>) {
    this.log({
      ...this.createBaseEntry(LogLevel.WARN, event, message),
      ...context
    })
  }

  info(event: LogEvent, message: string, context?: Partial<LogEntry>) {
    this.log({
      ...this.createBaseEntry(LogLevel.INFO, event, message),
      ...context
    })
  }

  debug(event: LogEvent, message: string, context?: Partial<LogEntry>) {
    // Only log debug in development
    if (this.environment === 'development') {
      this.log({
        ...this.createBaseEntry(LogLevel.DEBUG, event, message),
        ...context
      })
    }
  }

  // Essential helper methods for MVP

  // Log authentication events
  authLogin(userId: string) {
    this.info(LogEvent.AUTH_LOGIN, `User ${userId} logged in`, { userId })
  }

  authFailed(email: string, reason: string) {
    this.warn(LogEvent.AUTH_FAILED, `Authentication failed for ${email}: ${reason}`, {
      metadata: { email, reason }
    })
  }

  // Log content moderation (business requirement)
  contentModeration(
    contentType: 'post' | 'comment',
    contentId: string,
    newStatus: 'VISIBLE' | 'HIDDEN' | 'PENDING_REVIEW',
    moderatorId: string,
    reason?: string
  ) {
    this.info(
      LogEvent.CONTENT_MODERATION,
      `${contentType} ${contentId} status changed to ${newStatus}`,
      {
        userId: moderatorId,
        metadata: {
          contentType,
          contentId,
          newStatus,
          reason
        }
      }
    )
  }

  // Log database errors (essential for debugging)
  dbError(operation: string, error: Error, metadata?: Record<string, any>) {
    this.error(LogEvent.DB_ERROR, `Database operation failed: ${operation}`, {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      metadata
    })
  }

  // Log API errors (essential for debugging)
  apiError(operation: string, error: Error, metadata?: Record<string, any>) {
    this.error(LogEvent.API_ERROR, `API operation failed: ${operation}`, {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      metadata
    })
  }
}

// Export singleton instance
export const logger = new Logger()

// Export types for use in other modules
export type { LogEntry }