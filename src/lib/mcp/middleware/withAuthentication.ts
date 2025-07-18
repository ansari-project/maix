import type { NextRequest } from 'next/server';
import type { User } from '@prisma/client';
import { validateToken } from '../services/token.service';

/**
 * Extended request type that includes the authenticated user
 */
export interface AuthenticatedRequest extends NextRequest {
  user: User;
}

/**
 * Authentication result
 */
export type AuthResult = {
  success: true;
  user: User;
} | {
  success: false;
  error: string;
  statusCode: number;
};

/**
 * Extract and validate authentication token from request
 */
export async function authenticateRequest(req: NextRequest): Promise<AuthResult> {
  try {
    // Extract Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ') || authHeader === 'Bearer ') {
      return {
        success: false,
        error: 'Unauthorized: Missing or invalid Authorization header',
        statusCode: 401,
      };
    }

    // Extract the token
    const token = authHeader.substring(7).trim(); // Remove 'Bearer ' prefix and trim
    if (!token) {
      return {
        success: false,
        error: 'Unauthorized: Empty token',
        statusCode: 401,
      };
    }

    // Validate the token
    const user = await validateToken(token);
    if (!user) {
      return {
        success: false,
        error: 'Unauthorized: Invalid token',
        statusCode: 401,
      };
    }

    // Check if user is active
    if (!user.isActive) {
      return {
        success: false,
        error: 'Unauthorized: User account is inactive',
        statusCode: 401,
      };
    }

    return {
      success: true,
      user,
    };
  } catch (error) {
    console.error('Authentication error:', error);
    return {
      success: false,
      error: 'Internal server error during authentication',
      statusCode: 500,
    };
  }
}

/**
 * Middleware function that wraps API route handlers with authentication
 * This is the main authentication entry point for MCP endpoints
 */
export function withAuthentication<T extends AuthenticatedRequest>(
  handler: (req: T, ...args: any[]) => Promise<Response> | Response
) {
  return async (req: NextRequest, ...args: any[]): Promise<Response> => {
    const authResult = await authenticateRequest(req);
    
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        {
          status: authResult.statusCode,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Attach user to request object
    (req as T).user = authResult.user;
    
    // Call the actual handler
    return await handler(req as T, ...args);
  };
}