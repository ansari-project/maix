import type { User } from '@prisma/client';
import { validatePersonalAccessToken } from './pat.service';

/**
 * Multi-token validation service that can handle different token types
 * Currently supports Personal Access Tokens, but designed to be extensible
 * for OAuth tokens in the future.
 */
export async function validateToken(token: string): Promise<User | null> {
  try {
    // Check if it's a Personal Access Token (starts with maix_pat_)
    if (token.startsWith('maix_pat_')) {
      return await validatePersonalAccessToken(token);
    }
    
    // Future: Check if it's a JWT token (OAuth)
    // if (isJwtToken(token)) {
    //   return await validateJwtToken(token);
    // }
    
    // Unknown token format
    return null;
  } catch (error) {
    console.error('Error validating token:', error);
    return null;
  }
}

/**
 * Helper function to check if a token is a JWT (for future OAuth support)
 */
function isJwtToken(token: string): boolean {
  // JWT tokens have 3 parts separated by dots
  const parts = token.split('.');
  return parts.length === 3;
}

/**
 * Future: Validate JWT tokens for OAuth support
 */
// async function validateJwtToken(token: string): Promise<User | null> {
//   // Implementation for JWT validation
//   // This will be added when we implement OAuth
//   return null;
// }