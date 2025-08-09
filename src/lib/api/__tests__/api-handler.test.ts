import { NextRequest } from 'next/server'
import { ZodError } from 'zod'
import { describe, it, expect, beforeEach } from '@jest/globals'

// Mock the Prisma module with inline classes
jest.mock('@prisma/client', () => ({
  Prisma: {
    PrismaClientKnownRequestError: class extends Error {
      code: string
      clientVersion: string
      meta?: any

      constructor(message: string, options: { code: string; clientVersion: string; meta?: any }) {
        super(message)
        this.name = 'PrismaClientKnownRequestError'
        this.code = options.code
        this.clientVersion = options.clientVersion
        this.meta = options.meta
      }
    },
    PrismaClientUnknownRequestError: class extends Error {
      clientVersion: string

      constructor(message: string, options: { clientVersion: string }) {
        super(message)
        this.name = 'PrismaClientUnknownRequestError'
        this.clientVersion = options.clientVersion
      }
    },
    PrismaClientValidationError: class extends Error {
      clientVersion: string

      constructor(message: string, options: { clientVersion: string }) {
        super(message)
        this.name = 'PrismaClientValidationError'
        this.clientVersion = options.clientVersion
      }
    },
  },
}))

// Mock the logger before importing
jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}))

import { apiHandler } from '../api-handler'
import { logger } from '@/lib/logger'
import { Prisma } from '@prisma/client'

const mockLogger = logger as jest.Mocked<typeof logger>

describe('apiHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Method validation', () => {
    it('should handle valid HTTP methods', async () => {
      const handler = apiHandler({
        GET: async () => new Response(JSON.stringify({ message: 'GET success' }), { status: 200 }),
        POST: async () => new Response(JSON.stringify({ message: 'POST success' }), { status: 201 }),
      })

      const getRequest = new NextRequest('http://localhost:3000/api/test', { method: 'GET' })
      const getResponse = await handler(getRequest)
      expect(getResponse.status).toBe(200)
      expect(await getResponse.json()).toEqual({ message: 'GET success' })

      const postRequest = new NextRequest('http://localhost:3000/api/test', { method: 'POST' })
      const postResponse = await handler(postRequest)
      expect(postResponse.status).toBe(201)
      expect(await postResponse.json()).toEqual({ message: 'POST success' })
    })

    it('should return 405 for unsupported methods', async () => {
      const handler = apiHandler({
        GET: async () => new Response('OK'),
      })

      const request = new NextRequest('http://localhost:3000/api/test', { method: 'POST' })
      const response = await handler(request)

      expect(response.status).toBe(405)
      expect(response.headers.get('Allow')).toBe('GET')

      const data = await response.json()
      expect(data.error).toBe('Method POST Not Allowed. Allowed methods: GET')
    })

    it('should list all allowed methods in error response', async () => {
      const handler = apiHandler({
        GET: async () => new Response('OK'),
        POST: async () => new Response('OK'),
        PUT: async () => new Response('OK'),
      })

      const request = new NextRequest('http://localhost:3000/api/test', { method: 'DELETE' })
      const response = await handler(request)

      expect(response.status).toBe(405)
      expect(response.headers.get('Allow')).toBe('GET,POST,PUT')
      
      const data = await response.json()
      expect(data.error).toBe('Method DELETE Not Allowed. Allowed methods: GET,POST,PUT')
    })
  })

  describe('ZodError handling', () => {
    it('should handle ZodError with proper formatting', async () => {
      const zodError = new ZodError([
        {
          code: 'invalid_type',
          expected: 'string',
          received: 'number',
          path: ['name'],
          message: 'Expected string, received number',
        },
        {
          code: 'too_small',
          minimum: 5,
          type: 'string',
          inclusive: true,
          path: ['email', 'domain'],
          message: 'String must contain at least 5 character(s)',
        },
      ])

      const handler = apiHandler({
        POST: async () => {
          throw zodError
        },
      })

      const request = new NextRequest('http://localhost:3000/api/test', { method: 'POST' })
      const response = await handler(request)

      expect(response.status).toBe(400)
      
      const data = await response.json()
      expect(data.error).toBe('Validation failed')
      expect(data.details).toHaveLength(2)
      expect(data.details[0]).toEqual({
        field: 'name',
        message: 'Expected string, received number',
      })
      expect(data.details[1]).toEqual({
        field: 'email.domain',
        message: 'String must contain at least 5 character(s)',
      })

      expect(mockLogger.warn).toHaveBeenCalledWith('Validation error', {
        method: 'POST',
        url: 'http://localhost:3000/api/test',
        context: 'apiHandler',
        validationErrors: zodError.errors,
      })
    })
  })

  describe('Prisma error handling', () => {
    it('should handle P2002 - Unique constraint violation', async () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        { code: 'P2002', clientVersion: '5.0.0' }
      )

      const handler = apiHandler({
        POST: async () => {
          throw prismaError
        },
      })

      const request = new NextRequest('http://localhost:3000/api/test', { method: 'POST' })
      const response = await handler(request)

      expect(response.status).toBe(409)
      
      const data = await response.json()
      expect(data.error).toBe('A record with this data already exists')

      expect(mockLogger.error).toHaveBeenCalledWith('Prisma error', prismaError, {
        method: 'POST',
        url: 'http://localhost:3000/api/test',
        context: 'apiHandler',
        prismaErrorCode: 'P2002',
        prismaErrorMeta: undefined,
      })
    })

    it('should handle P2025 - Record not found', async () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Record not found',
        { code: 'P2025', clientVersion: '5.0.0' }
      )

      const handler = apiHandler({
        GET: async () => {
          throw prismaError
        },
      })

      const request = new NextRequest('http://localhost:3000/api/test', { method: 'GET' })
      const response = await handler(request)

      expect(response.status).toBe(404)
      
      const data = await response.json()
      expect(data.error).toBe('Record not found')
    })

    it('should handle P2003 - Foreign key constraint violation', async () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Foreign key constraint failed',
        { code: 'P2003', clientVersion: '5.0.0' }
      )

      const handler = apiHandler({
        POST: async () => {
          throw prismaError
        },
      })

      const request = new NextRequest('http://localhost:3000/api/test', { method: 'POST' })
      const response = await handler(request)

      expect(response.status).toBe(400)
      
      const data = await response.json()
      expect(data.error).toBe('Invalid reference to related record')
    })

    it('should handle P2016 - Query interpretation error', async () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Query interpretation error',
        { code: 'P2016', clientVersion: '5.0.0' }
      )

      const handler = apiHandler({
        GET: async () => {
          throw prismaError
        },
      })

      const request = new NextRequest('http://localhost:3000/api/test', { method: 'GET' })
      const response = await handler(request)

      expect(response.status).toBe(400)
      
      const data = await response.json()
      expect(data.error).toBe('Query interpretation error')
    })

    it('should handle unknown Prisma error codes', async () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Some other error',
        { code: 'P9999', clientVersion: '5.0.0' }
      )

      const handler = apiHandler({
        POST: async () => {
          throw prismaError
        },
      })

      const request = new NextRequest('http://localhost:3000/api/test', { method: 'POST' })
      const response = await handler(request)

      expect(response.status).toBe(500)
      
      const data = await response.json()
      expect(data.error).toBe('Database operation failed')
    })

    it('should handle PrismaClientUnknownRequestError', async () => {
      const prismaError = new Prisma.PrismaClientUnknownRequestError(
        'Unknown error occurred',
        { clientVersion: '5.0.0' }
      )

      const handler = apiHandler({
        POST: async () => {
          throw prismaError
        },
      })

      const request = new NextRequest('http://localhost:3000/api/test', { method: 'POST' })
      const response = await handler(request)

      expect(response.status).toBe(500)
      
      const data = await response.json()
      expect(data.error).toBe('Database error occurred')

      expect(mockLogger.error).toHaveBeenCalledWith('Unknown Prisma error', prismaError, {
        method: 'POST',
        url: 'http://localhost:3000/api/test',
        context: 'apiHandler',
      })
    })

    it('should handle PrismaClientValidationError', async () => {
      const prismaError = new Prisma.PrismaClientValidationError(
        'Invalid query',
        { clientVersion: '5.0.0' }
      )

      const handler = apiHandler({
        POST: async () => {
          throw prismaError
        },
      })

      const request = new NextRequest('http://localhost:3000/api/test', { method: 'POST' })
      const response = await handler(request)

      expect(response.status).toBe(400)
      
      const data = await response.json()
      expect(data.error).toBe('Invalid database query')

      expect(mockLogger.error).toHaveBeenCalledWith('Prisma validation error', prismaError, {
        method: 'POST',
        url: 'http://localhost:3000/api/test',
        context: 'apiHandler',
      })
    })
  })

  describe('Custom application errors', () => {
    it('should handle ValidationError', async () => {
      const validationError = new Error('User email is required')
      validationError.name = 'ValidationError'

      const handler = apiHandler({
        POST: async () => {
          throw validationError
        },
      })

      const request = new NextRequest('http://localhost:3000/api/test', { method: 'POST' })
      const response = await handler(request)

      expect(response.status).toBe(400)
      
      const data = await response.json()
      expect(data.error).toBe('User email is required')

      expect(mockLogger.warn).toHaveBeenCalledWith('Application validation error', {
        method: 'POST',
        url: 'http://localhost:3000/api/test',
        context: 'apiHandler',
        message: 'User email is required',
      })
    })
  })

  describe('Generic error handling', () => {
    it('should handle generic errors', async () => {
      const genericError = new Error('Unexpected error')

      const handler = apiHandler({
        GET: async () => {
          throw genericError
        },
      })

      const request = new NextRequest('http://localhost:3000/api/test', { method: 'GET' })
      const response = await handler(request)

      expect(response.status).toBe(500)
      
      const data = await response.json()
      expect(data.error).toBe('Internal server error')

      expect(mockLogger.error).toHaveBeenCalledWith('API handler error', genericError, {
        method: 'GET',
        url: 'http://localhost:3000/api/test',
        context: 'apiHandler',
      })
    })

    it('should handle non-Error thrown values', async () => {
      const handler = apiHandler({
        POST: async () => {
          throw 'String error'
        },
      })

      const request = new NextRequest('http://localhost:3000/api/test', { method: 'POST' })
      const response = await handler(request)

      expect(response.status).toBe(500)
      
      const data = await response.json()
      expect(data.error).toBe('Internal server error')

      expect(mockLogger.error).toHaveBeenCalledWith('API handler error', 'String error', {
        method: 'POST',
        url: 'http://localhost:3000/api/test',
        context: 'apiHandler',
      })
    })
  })

  describe('Successful responses', () => {
    it('should pass through successful responses unchanged', async () => {
      const successResponse = new Response(
        JSON.stringify({ message: 'Success', data: { id: 1 } }),
        { 
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )

      const handler = apiHandler({
        GET: async () => successResponse,
      })

      const request = new NextRequest('http://localhost:3000/api/test', { method: 'GET' })
      const response = await handler(request)

      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('application/json')
      
      const data = await response.json()
      expect(data).toEqual({ message: 'Success', data: { id: 1 } })

      // Should not log any errors
      expect(mockLogger.error).not.toHaveBeenCalled()
      expect(mockLogger.warn).not.toHaveBeenCalled()
    })
  })
})