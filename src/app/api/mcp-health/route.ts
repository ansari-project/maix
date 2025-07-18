import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    console.log('MCP Health: Starting health check');
    
    // Test database connection
    await prisma.$connect();
    console.log('MCP Health: Database connected');
    
    // Test if PersonalAccessToken table exists
    const patCount = await prisma.personalAccessToken.count();
    console.log('MCP Health: PersonalAccessToken table exists, count:', patCount);
    
    // Test if User table exists
    const userCount = await prisma.user.count();
    console.log('MCP Health: User table exists, count:', userCount);
    
    return NextResponse.json({ 
      status: 'healthy', 
      database: 'connected',
      tables: {
        personalAccessToken: { exists: true, count: patCount },
        user: { exists: true, count: userCount }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('MCP Health: Error during health check:', error);
    
    return NextResponse.json({ 
      status: 'unhealthy', 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}