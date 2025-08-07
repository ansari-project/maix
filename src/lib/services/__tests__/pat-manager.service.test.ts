import { 
  getOrCreateEventManagerPat, 
  validatePatToken, 
  revokeEventManagerPat,
  hasActiveEventManagerPat,
  encryptPatForStorage
} from '../pat-manager.service'
import { prisma } from '@/lib/prisma'
import { hashToken } from '@/lib/utils/encryption'

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    userPreferences: {
      findUnique: jest.fn(),
      create: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn()
    },
    personalAccessToken: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    }
  }
}))

// Mock encryption utilities
jest.mock('@/lib/utils/encryption', () => ({
  generateSecureToken: jest.fn(() => 'test-token-123'),
  hashToken: jest.fn((token) => `hashed-${token}`),
  encrypt: jest.fn((text) => `encrypted-${text}`),
  decrypt: jest.fn((text) => text.replace('encrypted-', '')),
  compareTokens: jest.fn((plain, hashed) => `hashed-${plain}` === hashed)
}))

describe('PAT Manager Service', () => {
  const mockUserId = 'user-123'
  const mockPatId = 'pat-123'
  const mockToken = 'test-token-123'
  const mockHashedToken = 'hashed-test-token-123'

  beforeEach(() => {
    jest.clearAllMocks()
    // Set a fixed date for consistent testing
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2025-01-01'))
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('getOrCreateEventManagerPat', () => {
    it('should create new PAT when user has no preferences', async () => {
      const mockPat = {
        id: mockPatId,
        userId: mockUserId,
        tokenHash: mockHashedToken,
        name: 'Event Manager (Auto-generated)',
        scopes: ['events:manage', 'todos:manage', 'registrations:view'],
        isSystemGenerated: true,
        expiresAt: new Date('2025-04-01'), // 90 days from now
        lastUsedAt: new Date('2025-01-01'),
        createdAt: new Date('2025-01-01')
      }

      ;(prisma.userPreferences.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prisma.userPreferences.create as jest.Mock).mockResolvedValue({
        id: 'pref-123',
        userId: mockUserId,
        eventManagerPat: null
      })
      ;(prisma.personalAccessToken.create as jest.Mock).mockResolvedValue(mockPat)
      ;(prisma.userPreferences.upsert as jest.Mock).mockResolvedValue({
        id: 'pref-123',
        userId: mockUserId,
        eventManagerPatId: mockPatId
      })

      const result = await getOrCreateEventManagerPat(mockUserId)

      expect(result).toEqual({
        ...mockPat,
        plainToken: mockToken
      })
      expect(prisma.personalAccessToken.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: mockUserId,
          tokenHash: mockHashedToken,
          isSystemGenerated: true,
          scopes: ['events:manage', 'todos:manage', 'registrations:view']
        })
      })
    })

    it('should return existing valid PAT', async () => {
      const mockPat = {
        id: mockPatId,
        userId: mockUserId,
        tokenHash: mockHashedToken,
        name: 'Event Manager (Auto-generated)',
        scopes: ['events:manage', 'todos:manage', 'registrations:view'],
        isSystemGenerated: true,
        expiresAt: new Date('2025-04-01'), // 90 days from now
        lastUsedAt: new Date('2024-12-20'),
        createdAt: new Date('2024-12-01')
      }

      ;(prisma.userPreferences.findUnique as jest.Mock).mockResolvedValue({
        id: 'pref-123',
        userId: mockUserId,
        eventManagerPat: mockPat,
        eventManagerPatId: mockPatId
      })

      const result = await getOrCreateEventManagerPat(mockUserId)

      expect(result).toEqual(mockPat)
      expect(prisma.personalAccessToken.create).not.toHaveBeenCalled()
    })

    it('should delete and recreate expired PAT', async () => {
      const expiredPat = {
        id: mockPatId,
        userId: mockUserId,
        tokenHash: mockHashedToken,
        expiresAt: new Date('2024-12-01'), // Expired
        lastUsedAt: new Date('2024-11-20')
      }

      const newPat = {
        id: 'pat-456',
        userId: mockUserId,
        tokenHash: mockHashedToken,
        name: 'Event Manager (Auto-generated)',
        scopes: ['events:manage', 'todos:manage', 'registrations:view'],
        isSystemGenerated: true,
        expiresAt: new Date('2025-04-01'),
        lastUsedAt: new Date('2025-01-01'),
        createdAt: new Date('2025-01-01')
      }

      ;(prisma.userPreferences.findUnique as jest.Mock).mockResolvedValue({
        id: 'pref-123',
        userId: mockUserId,
        eventManagerPat: expiredPat,
        eventManagerPatId: mockPatId
      })
      ;(prisma.personalAccessToken.delete as jest.Mock).mockResolvedValue(expiredPat)
      ;(prisma.personalAccessToken.create as jest.Mock).mockResolvedValue(newPat)
      ;(prisma.userPreferences.upsert as jest.Mock).mockResolvedValue({
        id: 'pref-123',
        userId: mockUserId,
        eventManagerPatId: 'pat-456'
      })

      const result = await getOrCreateEventManagerPat(mockUserId)

      expect(prisma.personalAccessToken.delete).toHaveBeenCalledWith({
        where: { id: mockPatId }
      })
      expect(result.id).toBe('pat-456')
      expect(result.plainToken).toBe(mockToken)
    })

    it('should refresh PAT expiring within 7 days', async () => {
      const expiringPat = {
        id: mockPatId,
        userId: mockUserId,
        tokenHash: mockHashedToken,
        expiresAt: new Date('2025-01-06'), // Expires in 5 days
        lastUsedAt: new Date('2024-12-20')
      }

      const newPat = {
        id: 'pat-789',
        userId: mockUserId,
        tokenHash: mockHashedToken,
        name: 'Event Manager (Auto-generated)',
        scopes: ['events:manage', 'todos:manage', 'registrations:view'],
        isSystemGenerated: true,
        expiresAt: new Date('2025-04-01'),
        lastUsedAt: new Date('2025-01-01'),
        createdAt: new Date('2025-01-01')
      }

      ;(prisma.userPreferences.findUnique as jest.Mock).mockResolvedValue({
        id: 'pref-123',
        userId: mockUserId,
        eventManagerPat: expiringPat,
        eventManagerPatId: mockPatId
      })
      ;(prisma.personalAccessToken.create as jest.Mock).mockResolvedValue(newPat)
      ;(prisma.userPreferences.upsert as jest.Mock).mockResolvedValue({
        id: 'pref-123',
        userId: mockUserId,
        eventManagerPatId: 'pat-789'
      })
      ;(prisma.personalAccessToken.delete as jest.Mock).mockResolvedValue(expiringPat)

      const result = await getOrCreateEventManagerPat(mockUserId)

      expect(result.id).toBe('pat-789')
      expect(result.plainToken).toBe(mockToken)
      expect(prisma.personalAccessToken.delete).toHaveBeenCalledWith({
        where: { id: mockPatId }
      })
    })
  })

  describe('validatePatToken', () => {
    it('should validate and return user for valid token', async () => {
      const mockUser = {
        id: mockUserId,
        email: 'test@example.com',
        name: 'Test User'
      }

      const mockPat = {
        id: mockPatId,
        userId: mockUserId,
        tokenHash: mockHashedToken,
        expiresAt: new Date('2025-04-01'),
        user: mockUser
      }

      ;(prisma.personalAccessToken.findFirst as jest.Mock).mockResolvedValue(mockPat)
      ;(prisma.personalAccessToken.update as jest.Mock).mockResolvedValue({
        ...mockPat,
        lastUsedAt: new Date('2025-01-01')
      })

      const result = await validatePatToken(mockToken)

      expect(result).toEqual(mockUser)
      expect(prisma.personalAccessToken.update).toHaveBeenCalledWith({
        where: { id: mockPatId },
        data: { lastUsedAt: new Date('2025-01-01') }
      })
    })

    it('should return null for invalid token', async () => {
      ;(prisma.personalAccessToken.findFirst as jest.Mock).mockResolvedValue(null)

      const result = await validatePatToken('invalid-token')

      expect(result).toBeNull()
      expect(prisma.personalAccessToken.update).not.toHaveBeenCalled()
    })

    it('should return null for expired token', async () => {
      ;(prisma.personalAccessToken.findFirst as jest.Mock).mockResolvedValue(null)

      const result = await validatePatToken(mockToken)

      expect(result).toBeNull()
      expect(hashToken).toHaveBeenCalledWith(mockToken)
      expect(prisma.personalAccessToken.findFirst).toHaveBeenCalledWith({
        where: {
          tokenHash: mockHashedToken,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date('2025-01-01') } }
          ]
        },
        include: { user: true }
      })
    })
  })

  describe('revokeEventManagerPat', () => {
    it('should revoke existing PAT', async () => {
      ;(prisma.userPreferences.findUnique as jest.Mock).mockResolvedValue({
        id: 'pref-123',
        userId: mockUserId,
        eventManagerPatId: mockPatId
      })
      ;(prisma.personalAccessToken.delete as jest.Mock).mockResolvedValue({
        id: mockPatId
      })
      ;(prisma.userPreferences.update as jest.Mock).mockResolvedValue({
        id: 'pref-123',
        userId: mockUserId,
        eventManagerPatId: null
      })

      await revokeEventManagerPat(mockUserId)

      expect(prisma.personalAccessToken.delete).toHaveBeenCalledWith({
        where: { id: mockPatId }
      })
      expect(prisma.userPreferences.update).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        data: { eventManagerPatId: null }
      })
    })

    it('should handle case when no PAT exists', async () => {
      ;(prisma.userPreferences.findUnique as jest.Mock).mockResolvedValue({
        id: 'pref-123',
        userId: mockUserId,
        eventManagerPatId: null
      })

      await revokeEventManagerPat(mockUserId)

      expect(prisma.personalAccessToken.delete).not.toHaveBeenCalled()
      expect(prisma.userPreferences.update).not.toHaveBeenCalled()
    })
  })

  describe('hasActiveEventManagerPat', () => {
    it('should return true for active PAT', async () => {
      ;(prisma.userPreferences.findUnique as jest.Mock).mockResolvedValue({
        id: 'pref-123',
        userId: mockUserId,
        eventManagerPat: {
          id: mockPatId,
          expiresAt: new Date('2025-04-01')
        }
      })

      const result = await hasActiveEventManagerPat(mockUserId)

      expect(result).toBe(true)
    })

    it('should return false for expired PAT', async () => {
      ;(prisma.userPreferences.findUnique as jest.Mock).mockResolvedValue({
        id: 'pref-123',
        userId: mockUserId,
        eventManagerPat: {
          id: mockPatId,
          expiresAt: new Date('2024-12-01')
        }
      })

      const result = await hasActiveEventManagerPat(mockUserId)

      expect(result).toBe(false)
    })

    it('should return false when no PAT exists', async () => {
      ;(prisma.userPreferences.findUnique as jest.Mock).mockResolvedValue({
        id: 'pref-123',
        userId: mockUserId,
        eventManagerPat: null
      })

      const result = await hasActiveEventManagerPat(mockUserId)

      expect(result).toBe(false)
    })

    it('should return true for PAT with no expiry', async () => {
      ;(prisma.userPreferences.findUnique as jest.Mock).mockResolvedValue({
        id: 'pref-123',
        userId: mockUserId,
        eventManagerPat: {
          id: mockPatId,
          expiresAt: null
        }
      })

      const result = await hasActiveEventManagerPat(mockUserId)

      expect(result).toBe(true)
    })
  })

  describe('encryptPatForStorage', () => {
    it('should encrypt token for client storage', () => {
      const result = encryptPatForStorage(mockToken)

      expect(result).toBe(`encrypted-${mockToken}`)
    })
  })
})