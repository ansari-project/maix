import { NextResponse } from "next/server"
import { logger } from "@/lib/logger"

export async function GET() {
  // Test different log levels
  logger.debug("This is a debug message", { extra: "debug data" })
  logger.info("This is an info message", { userId: "test-123" })
  logger.warn("This is a warning", { threshold: 100, actual: 150 })
  
  // Test error logging
  const testError = new Error("This is a test error")
  logger.error("Test error occurred", testError, { context: "test-route" })
  
  // Test child logger with request context
  const requestLogger = logger.child({ 
    requestId: "test-request-123",
    path: "/api/test-logging" 
  })
  
  requestLogger.info("Processing request with child logger")
  requestLogger.debug("Child logger debug info", { step: "validation" })
  
  // Test convenience methods
  logger.authLogin("user-123", "test@example.com")
  logger.authFailed("test@example.com", "Invalid password")
  logger.dbQuery("SELECT", "users", 45)
  
  // Flush logs (important for serverless)
  await logger.flush()
  
  return NextResponse.json({ 
    message: "Logging test complete! Check your console (dev) or Axiom dashboard (prod)" 
  })
}