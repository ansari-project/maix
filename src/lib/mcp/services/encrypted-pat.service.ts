import { prisma } from '@/lib/prisma';
import { generateSecureToken, hashToken } from '@/lib/mcp/services/pat.service';
import { encrypt, decrypt } from '@/lib/utils/encryption';

/**
 * Personal Access Token with encrypted storage for AI Assistant
 * 
 * This is a specialized PAT service that stores encrypted tokens
 * so they can be retrieved for the AI Assistant to use.
 */

interface AIAssistantPAT {
  id: string;
  userId: string;
  encryptedToken: string;
  tokenHash: string;
  expiresAt: Date | null;
  createdAt: Date;
}

/**
 * Get or create an AI Assistant PAT for a user
 * This stores the PAT encrypted so it can be retrieved
 */
export async function getOrCreateEncryptedAIAssistantPat(userId: string): Promise<string> {
  const PAT_NAME = 'AI Assistant (Auto-generated)';
  
  try {
    // Check for existing non-expired AI Assistant PAT
    const existingPat = await prisma.personalAccessToken.findFirst({
      where: {
        userId,
        name: PAT_NAME,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      }
    });

    if (existingPat && existingPat.encryptedToken) {
      // Try to decrypt the stored token
      try {
        const decryptedToken = decrypt(existingPat.encryptedToken);
        console.log(`Using existing AI Assistant PAT for user ${userId}`);
        return decryptedToken;
      } catch (error) {
        console.error('Failed to decrypt existing PAT, creating new one:', error);
      }
    }

    // Create new PAT with 90-day expiry
    const token = generateSecureToken();
    const tokenHash = hashToken(token);
    const encryptedToken = encrypt(token);
    
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 90);

    // Store the PAT with encrypted token
    await prisma.personalAccessToken.create({
      data: {
        userId,
        name: PAT_NAME,
        tokenHash,
        expiresAt,
        encryptedToken
      }
    });

    console.log(`Created new AI Assistant PAT for user ${userId}`);
    return token;

  } catch (error) {
    console.error('Failed to get/create AI Assistant PAT:', error);
    throw new Error('Failed to create AI Assistant access token');
  }
}

/**
 * Revoke all AI Assistant PATs for a user
 */
export async function revokeAIAssistantPats(userId: string): Promise<number> {
  try {
    const result = await prisma.personalAccessToken.deleteMany({
      where: {
        userId,
        name: 'AI Assistant (Auto-generated)'
      }
    });

    return result.count;
  } catch (error) {
    console.error('Failed to revoke AI Assistant PATs:', error);
    return 0;
  }
}

/**
 * Cleanup expired AI Assistant PATs
 */
export async function cleanupExpiredAIAssistantPats(): Promise<number> {
  try {
    const result = await prisma.personalAccessToken.deleteMany({
      where: {
        name: 'AI Assistant (Auto-generated)',
        expiresAt: {
          lt: new Date()
        }
      }
    });

    return result.count;
  } catch (error) {
    console.error('Failed to cleanup expired AI Assistant PATs:', error);
    return 0;
  }
}