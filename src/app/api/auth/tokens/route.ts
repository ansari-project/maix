import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { 
  createPersonalAccessToken, 
  listPersonalAccessTokens, 
  revokePersonalAccessToken 
} from '@/lib/mcp/services/pat.service';

/**
 * GET /api/auth/tokens - List all personal access tokens for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Get user ID from email
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });
    
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const tokens = await listPersonalAccessTokens(user.id);
    
    return new Response(
      JSON.stringify({ tokens }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error listing tokens:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * POST /api/auth/tokens - Create a new personal access token
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const body = await request.json();
    const { name, expiresAt } = body;
    
    if (!name || typeof name !== 'string' || name.length < 1 || name.length > 100) {
      return new Response(
        JSON.stringify({ error: 'Token name is required and must be 1-100 characters' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const expirationDate = expiresAt ? new Date(expiresAt) : undefined;
    
    // Get user ID from email
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });
    
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const { token, tokenRecord } = await createPersonalAccessToken(
      user.id,
      name,
      expirationDate
    );
    
    return new Response(
      JSON.stringify({
        token, // This is the only time the raw token is returned
        tokenRecord: {
          id: tokenRecord.id,
          name: tokenRecord.name,
          createdAt: tokenRecord.createdAt,
          expiresAt: tokenRecord.expiresAt,
        }
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error creating token:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}