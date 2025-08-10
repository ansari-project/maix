import { getOrCreateEncryptedAIAssistantPat, revokeAIAssistantPats } from '../encrypted-pat.service'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/utils/encryption'
import { hashToken } from '../pat.service'

// Mock the prisma client
jest.mock('@/lib/prisma', () => ({
  prisma: {
    personalAccessToken: {
      findFirst: jest.fn(),
      create: jest.fn(),
      deleteMany: jest.fn(),
    }
  }
}))

// Mock encryption utilities
jest.mock('@/lib/utils/encryption', () => ({
  encrypt: jest.fn((text: string) => `encrypted_${text}`),
  decrypt: jest.fn((text: string) => text.replace('encrypted_', ''))
}))

// Mock PAT service
jest.mock('../pat.service', () => ({
  generateSecureToken: jest.fn(() => 'test_token_123'),
  hashToken: jest.fn((token: string) => `hashed_${token}`)
}))

describe('encrypted-pat.service', () => {
  const mockUserId = 'user123'
  
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getOrCreateEncryptedAIAssistantPat', () => {
    it('should return existing PAT when found and decryptable', async () => {
      const mockPat = {
        id: 'pat123',
        userId: mockUserId,
        encryptedToken: 'encrypted_existing_token',
        name: 'AI Assistant (Auto-generated)',
      }
      
      ;(prisma.personalAccessToken.findFirst as jest.Mock).mockResolvedValue(mockPat)
      ;(decrypt as jest.Mock).mockReturnValue('existing_token')
      
      const result = await getOrCreateEncryptedAIAssistantPat(mockUserId)
      
      expect(result).toBe('existing_token')
      expect(prisma.personalAccessToken.findFirst).toHaveBeenCalledWith({
        where: {
          userId: mockUserId,
          name: 'AI Assistant (Auto-generated)',
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: expect.any(Date) } }
          ]
        }
      })
      expect(decrypt).toHaveBeenCalledWith('encrypted_existing_token')
      expect(prisma.personalAccessToken.create).not.toHaveBeenCalled()
    })

    it('should create new PAT when none exists', async () => {
      ;(prisma.personalAccessToken.findFirst as jest.Mock).mockResolvedValue(null)
      ;(prisma.personalAccessToken.create as jest.Mock).mockResolvedValue({
        id: 'new_pat',
        tokenHash: 'hashed_test_token_123'
      })
      
      const result = await getOrCreateEncryptedAIAssistantPat(mockUserId)
      
      expect(result).toBe('test_token_123')
      expect(prisma.personalAccessToken.create).toHaveBeenCalledWith({
        data: {
          userId: mockUserId,
          name: 'AI Assistant (Auto-generated)',
          tokenHash: 'hashed_test_token_123',
          expiresAt: expect.any(Date),
          encryptedToken: 'encrypted_test_token_123'
        }
      })
    })

    it('should create new PAT when decryption fails', async () => {
      const mockPat = {
        id: 'pat123',
        userId: mockUserId,
        encryptedToken: 'corrupted_token',
        name: 'AI Assistant (Auto-generated)',
      }
      
      ;(prisma.personalAccessToken.findFirst as jest.Mock).mockResolvedValue(mockPat)
      ;(decrypt as jest.Mock).mockImplementation(() => {
        throw new Error('Decryption failed')
      })
      ;(prisma.personalAccessToken.create as jest.Mock).mockResolvedValue({
        id: 'new_pat',
        tokenHash: 'hashed_test_token_123'
      })
      
      const result = await getOrCreateEncryptedAIAssistantPat(mockUserId)
      
      expect(result).toBe('test_token_123')
      expect(decrypt).toHaveBeenCalledWith('corrupted_token')
      expect(prisma.personalAccessToken.create).toHaveBeenCalled()
    })
  })

  describe('revokeAIAssistantPats', () => {
    it('should delete all AI Assistant PATs for a user', async () => {
      ;(prisma.personalAccessToken.deleteMany as jest.Mock).mockResolvedValue({
        count: 3
      })
      
      const result = await revokeAIAssistantPats(mockUserId)
      
      expect(result).toBe(3)
      expect(prisma.personalAccessToken.deleteMany).toHaveBeenCalledWith({
        where: {
          userId: mockUserId,
          name: 'AI Assistant (Auto-generated)'
        }
      })
    })

    it('should return 0 when deletion fails', async () => {
      ;(prisma.personalAccessToken.deleteMany as jest.Mock).mockRejectedValue(
        new Error('Database error')
      )
      
      const result = await revokeAIAssistantPats(mockUserId)
      
      expect(result).toBe(0)
    })
  })
})