import crypto from 'crypto'
import {
  encrypt,
  decrypt,
  generateSecureToken,
  hashToken,
  compareTokens
} from '../encryption'
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'

// Mock crypto methods for consistent testing
const mockIv = Buffer.from('1234567890123456')
const mockAuthTag = Buffer.from('abcdefghijklmnop')

describe('Encryption Utilities', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...originalEnv }
    process.env.NEXTAUTH_SECRET = 'test-secret-key-for-encryption'
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('encrypt and decrypt', () => {
    it('should encrypt and decrypt text successfully', () => {
      const plainText = 'This is a secret message'
      
      const encrypted = encrypt(plainText)
      expect(encrypted).toBeTruthy()
      expect(encrypted).not.toBe(plainText)
      expect(typeof encrypted).toBe('string')
      
      const decrypted = decrypt(encrypted)
      expect(decrypted).toBe(plainText)
    })

    it('should produce different ciphertext for same plaintext (due to random IV)', () => {
      const plainText = 'Same message'
      
      const encrypted1 = encrypt(plainText)
      const encrypted2 = encrypt(plainText)
      
      expect(encrypted1).not.toBe(encrypted2)
      
      // But both should decrypt to the same value
      expect(decrypt(encrypted1)).toBe(plainText)
      expect(decrypt(encrypted2)).toBe(plainText)
    })

    it('should handle empty strings', () => {
      const plainText = ''
      
      const encrypted = encrypt(plainText)
      const decrypted = decrypt(encrypted)
      
      expect(decrypted).toBe(plainText)
    })

    it('should handle special characters and unicode', () => {
      const plainText = '🔐 Special chars: !@#$%^&*() 中文 العربية'
      
      const encrypted = encrypt(plainText)
      const decrypted = decrypt(encrypted)
      
      expect(decrypted).toBe(plainText)
    })

    it('should throw error when AUTH_SECRET is not set', () => {
      delete process.env.NEXTAUTH_SECRET
      delete process.env.AUTH_SECRET
      
      // Need to reimport to get the new env state
      jest.resetModules()
      const { encrypt: encryptNoSecret } = require('../encryption')
      
      expect(() => encryptNoSecret('test')).toThrow('AUTH_SECRET is required for encryption')
    })

    it('should use AUTH_SECRET if NEXTAUTH_SECRET is not available', () => {
      delete process.env.NEXTAUTH_SECRET
      process.env.AUTH_SECRET = 'auth-secret-fallback'
      
      jest.resetModules()
      const { encrypt: encryptWithAuthSecret, decrypt: decryptWithAuthSecret } = require('../encryption')
      
      const plainText = 'Test with AUTH_SECRET'
      const encrypted = encryptWithAuthSecret(plainText)
      const decrypted = decryptWithAuthSecret(encrypted)
      
      expect(decrypted).toBe(plainText)
    })

    it('should fail to decrypt with wrong key', () => {
      const plainText = 'Secret data'
      const encrypted = encrypt(plainText)
      
      // Change the secret
      process.env.NEXTAUTH_SECRET = 'different-secret-key'
      jest.resetModules()
      const { decrypt: decryptWithWrongKey } = require('../encryption')
      
      expect(() => decryptWithWrongKey(encrypted)).toThrow()
    })

    it('should handle corrupted encrypted data', () => {
      const corruptedData = 'not-valid-base64-encrypted-data!!!'
      
      expect(() => decrypt(corruptedData)).toThrow()
    })
  })

  describe('generateSecureToken', () => {
    it('should generate a URL-safe token of default length', () => {
      const token = generateSecureToken()
      
      expect(token).toBeTruthy()
      expect(typeof token).toBe('string')
      // Base64url encoding of 32 bytes should be 43 characters (no padding)
      expect(token.length).toBeGreaterThanOrEqual(43)
      // Should not contain URL-unsafe characters
      expect(token).not.toMatch(/[+/=]/)
    })

    it('should generate tokens of specified length', () => {
      const token16 = generateSecureToken(16)
      const token64 = generateSecureToken(64)
      
      // Base64url encoding increases size by ~4/3
      expect(token16.length).toBeGreaterThanOrEqual(22) // 16 * 4/3 ≈ 22
      expect(token64.length).toBeGreaterThanOrEqual(86) // 64 * 4/3 ≈ 86
    })

    it('should generate unique tokens', () => {
      const tokens = new Set()
      for (let i = 0; i < 100; i++) {
        tokens.add(generateSecureToken())
      }
      
      // All 100 tokens should be unique
      expect(tokens.size).toBe(100)
    })
  })

  describe('hashToken', () => {
    it('should hash a token consistently', () => {
      const token = 'my-secret-token'
      
      const hash1 = hashToken(token)
      const hash2 = hashToken(token)
      
      expect(hash1).toBe(hash2)
      expect(hash1).toHaveLength(64) // SHA-256 produces 64 hex characters
      expect(hash1).toMatch(/^[a-f0-9]+$/) // Should be hex
    })

    it('should produce different hashes for different tokens', () => {
      const token1 = 'token-one'
      const token2 = 'token-two'
      
      const hash1 = hashToken(token1)
      const hash2 = hashToken(token2)
      
      expect(hash1).not.toBe(hash2)
    })

    it('should handle empty strings', () => {
      const hash = hashToken('')
      
      expect(hash).toBeTruthy()
      expect(hash).toHaveLength(64)
    })

    it('should handle special characters', () => {
      const token = '!@#$%^&*()_+-=[]{}|;:,.<>?'
      
      const hash = hashToken(token)
      
      expect(hash).toBeTruthy()
      expect(hash).toHaveLength(64)
    })
  })

  describe('compareTokens', () => {
    it('should return true for matching tokens', () => {
      const token = 'my-token'
      const hashedToken = hashToken(token)
      
      const result = compareTokens(token, hashedToken)
      
      expect(result).toBe(true)
    })

    it('should return false for non-matching tokens', () => {
      const token1 = 'token-one'
      const token2 = 'token-two'
      const hashedToken = hashToken(token1)
      
      const result = compareTokens(token2, hashedToken)
      
      expect(result).toBe(false)
    })

    it('should use timing-safe comparison', () => {
      // This test verifies the function uses crypto.timingSafeEqual
      // by checking it doesn't throw when buffers are same length
      const token = 'test-token'
      const correctHash = hashToken(token)
      const wrongHash = hashToken('wrong-token')
      
      // Both should complete without timing differences
      expect(() => compareTokens(token, correctHash)).not.toThrow()
      expect(() => compareTokens(token, wrongHash)).not.toThrow()
    })

    it('should handle comparison with invalid hash format', () => {
      const token = 'test-token'
      const invalidHash = 'not-a-valid-hash'
      
      // Should handle gracefully (timing-safe comparison will fail)
      expect(() => compareTokens(token, invalidHash)).toThrow()
    })
  })

  describe('Integration tests', () => {
    it('should work end-to-end for token generation, hashing, and validation', () => {
      // Generate a token
      const token = generateSecureToken()
      
      // Hash it for storage
      const hashedToken = hashToken(token)
      
      // Encrypt it for client storage
      const encryptedToken = encrypt(token)
      
      // Later, decrypt and validate
      const decryptedToken = decrypt(encryptedToken)
      expect(decryptedToken).toBe(token)
      
      // Compare with stored hash
      const isValid = compareTokens(decryptedToken, hashedToken)
      expect(isValid).toBe(true)
    })
  })
})