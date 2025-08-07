import crypto from 'crypto'

// Derive encryption key from environment secret
function getEncryptionKey(): Buffer {
  const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET
  if (!secret) {
    throw new Error('AUTH_SECRET is required for encryption')
  }
  
  // Create a consistent 32-byte key from the secret
  return crypto.createHash('sha256').update(secret).digest()
}

/**
 * Encrypts a string value using AES-256-GCM
 * Returns base64 encoded encrypted data with IV and auth tag
 */
export function encrypt(text: string): string {
  const key = getEncryptionKey()
  const iv = crypto.randomBytes(16)
  
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  
  let encrypted = cipher.update(text, 'utf8', 'base64')
  encrypted += cipher.final('base64')
  
  const authTag = cipher.getAuthTag()
  
  // Combine IV, auth tag, and encrypted data
  const combined = Buffer.concat([
    iv,
    authTag,
    Buffer.from(encrypted, 'base64')
  ])
  
  return combined.toString('base64')
}

/**
 * Decrypts a string value encrypted with encrypt()
 * Returns the original plaintext string
 */
export function decrypt(encryptedData: string): string {
  const key = getEncryptionKey()
  const combined = Buffer.from(encryptedData, 'base64')
  
  // Extract IV, auth tag, and encrypted data
  const iv = combined.subarray(0, 16)
  const authTag = combined.subarray(16, 32)
  const encrypted = combined.subarray(32)
  
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(authTag)
  
  let decrypted = decipher.update(encrypted, undefined, 'utf8')
  decrypted += decipher.final('utf8')
  
  return decrypted
}

/**
 * Generates a secure random token
 * Returns a URL-safe base64 encoded string
 */
export function generateSecureToken(bytes: number = 32): string {
  return crypto.randomBytes(bytes).toString('base64url')
}

/**
 * Hashes a token for storage in the database
 * Uses SHA-256 for consistent, secure hashing
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

/**
 * Compares a plain token with a hashed token
 * Constant-time comparison to prevent timing attacks
 */
export function compareTokens(plainToken: string, hashedToken: string): boolean {
  const hash = hashToken(plainToken)
  return crypto.timingSafeEqual(
    Buffer.from(hash),
    Buffer.from(hashedToken)
  )
}