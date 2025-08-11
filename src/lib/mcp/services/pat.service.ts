import { createHash } from 'crypto';
import { randomBytes } from 'crypto';
import { prisma } from '@/lib/prisma';
import type { User } from '@prisma/client';

/**
 * Generate a secure Personal Access Token
 */
export function generateSecureToken(): string {
  // Generate 32 random bytes and encode as hex
  const tokenBytes = randomBytes(32);
  const tokenString = tokenBytes.toString('hex');
  
  // Add a prefix to make it identifiable
  return `maix_pat_${tokenString}`;
}

/**
 * Hash a token using SHA-256
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Validate a Personal Access Token and return the associated user
 */
export async function validatePersonalAccessToken(token: string): Promise<User | null> {
  try {
    console.log('PAT: Validating token', {
      tokenPrefix: token.substring(0, 20) + '...',
      tokenLength: token.length
    });
    
    // Hash the provided token
    const tokenHash = hashToken(token);
    console.log('PAT: Token hashed', {
      hashPrefix: tokenHash.substring(0, 16) + '...'
    });
    
    // Query the database for the hashed token
    const pat = await prisma.personalAccessToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
    
    console.log('PAT: Database query result', {
      found: !!pat,
      patId: pat?.id,
      userId: pat?.user?.id,
      isExpired: pat?.expiresAt ? pat.expiresAt < new Date() : false
    });
    
    if (!pat) {
      console.log('PAT: No matching token found in database');
      return null;
    }
    
    // Check if token is expired
    if (pat.expiresAt && pat.expiresAt < new Date()) {
      console.log('PAT: Token is expired', { expiresAt: pat.expiresAt });
      return null;
    }
    
    // Update last used timestamp asynchronously (don't await)
    prisma.personalAccessToken.update({
      where: { id: pat.id },
      data: { lastUsedAt: new Date() },
    }).catch(error => {
      console.error('Failed to update PAT lastUsedAt:', error);
    });
    
    return pat.user;
  } catch (error) {
    console.error('Error validating PAT:', error);
    return null;
  }
}

/**
 * Create a new Personal Access Token for a user
 */
export async function createPersonalAccessToken(
  userId: string,
  name: string,
  expiresAt?: Date
): Promise<{ token: string; tokenRecord: any }> {
  const token = generateSecureToken();
  const tokenHash = hashToken(token);
  
  const tokenRecord = await prisma.personalAccessToken.create({
    data: {
      userId,
      name,
      tokenHash,
      expiresAt,
    },
    include: { user: true },
  });
  
  return { token, tokenRecord };
}

/**
 * Revoke a Personal Access Token
 */
export async function revokePersonalAccessToken(
  tokenId: string,
  userId: string
): Promise<boolean> {
  try {
    await prisma.personalAccessToken.delete({
      where: { 
        id: tokenId,
        userId, // Ensure user can only revoke their own tokens
      },
    });
    return true;
  } catch (error) {
    console.error('Failed to revoke PAT:', error);
    return false;
  }
}

/**
 * List all Personal Access Tokens for a user
 */
export async function listPersonalAccessTokens(userId: string) {
  return await prisma.personalAccessToken.findMany({
    where: { userId },
    select: {
      id: true,
      name: true,
      createdAt: true,
      lastUsedAt: true,
      expiresAt: true,
      // Don't include tokenHash for security
    },
    orderBy: { createdAt: 'desc' },
  });
}