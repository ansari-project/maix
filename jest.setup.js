import '@testing-library/jest-dom'

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