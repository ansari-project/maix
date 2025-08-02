import '@testing-library/jest-dom'

// Add polyfills for TextEncoder/TextDecoder (required by React Email)
const { TextEncoder, TextDecoder } = require('util')
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// Silence React act warnings in tests
const originalError = console.error
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('ReactDOMTestUtils.act')
    ) {
      return
    }
    originalError.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
})

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
  }),
}))

// Mock Next.js server components
global.Request = global.Request || class Request {}
global.Response = global.Response || class Response {
  constructor(body, init) {
    this.body = body
    this.status = init?.status || 200
    this.headers = new Headers(init?.headers || {})
  }
  
  json() {
    return Promise.resolve(typeof this.body === 'string' ? JSON.parse(this.body) : this.body)
  }
  
  text() {
    return Promise.resolve(typeof this.body === 'string' ? this.body : JSON.stringify(this.body))
  }
}
global.Headers = global.Headers || class Headers {
  constructor(init) {
    this.headers = new Map()
    if (init) {
      Object.entries(init).forEach(([key, value]) => {
        this.headers.set(key, value)
      })
    }
  }
  
  get(name) {
    return this.headers.get(name)
  }
  
  set(name, value) {
    this.headers.set(name, value)
  }
}

// Mock NextResponse
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((data, init) => {
      return new Response(JSON.stringify(data), {
        status: init?.status || 200,
        headers: {
          'Content-Type': 'application/json',
          ...(init?.headers || {}),
        },
      })
    }),
  },
  NextRequest: jest.fn().mockImplementation((url, init) => {
    return {
      url,
      method: init?.method || 'GET',
      headers: new Headers(init?.headers || {}),
      cookies: {
        get: jest.fn(),
      },
      json: jest.fn().mockResolvedValue(init?.body ? JSON.parse(init.body) : {}),
    }
  }),
}))

// Mock next-auth
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(),
}))

// Mock Prisma
jest.mock('./src/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    project: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    application: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    notification: {
      findMany: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
    },
    notificationPreference: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    post: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}))

// Mock bcryptjs
jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}))

// Mock Resend
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: jest.fn().mockResolvedValue({ id: 'test-email-id' }),
    },
  })),
}))

// Mock NotificationService
jest.mock('@/services/notification.service', () => ({
  NotificationService: {
    createApplicationNew: jest.fn().mockResolvedValue({ id: 'test-notification' }),
    createApplicationStatusChanged: jest.fn().mockResolvedValue({ id: 'test-notification' }),
    createAnswerNew: jest.fn().mockResolvedValue({ id: 'test-notification' }),
    createNewProject: jest.fn().mockResolvedValue({ id: 'test-notification' }),
    createNewQuestion: jest.fn().mockResolvedValue({ id: 'test-notification' }),
    getUserNotifications: jest.fn().mockResolvedValue([]),
    markAsRead: jest.fn().mockResolvedValue({ count: 0 }),
    getUnreadCount: jest.fn().mockResolvedValue(0),
  },
}))

// Mock email service
jest.mock('@/services/email.service', () => ({
  sendNotificationEmail: jest.fn().mockResolvedValue({ id: 'test-email' }),
}))