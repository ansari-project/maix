import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  // Simple auth check
  const authHeader = request.headers.get('Authorization');
  if (authHeader !== `Bearer ${process.env.ADMIN_SECRET || process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    console.log('Running database seed...');
    
    // Run seed
    const { stdout, stderr } = await execAsync('npx prisma db seed');
    
    console.log('Seed output:', stdout);
    if (stderr) console.error('Seed errors:', stderr);

    return NextResponse.json({
      success: true,
      output: stdout,
      error: stderr || null
    });
  } catch (error: any) {
    console.error('Seed failed:', error);
    return NextResponse.json(
      { 
        error: 'Seed failed', 
        details: error.message,
        output: error.stdout,
        stderr: error.stderr
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  // Simple auth check
  const authHeader = request.headers.get('Authorization');
  if (authHeader !== `Bearer ${process.env.ADMIN_SECRET || process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  return NextResponse.json({
    message: 'POST to this endpoint to run seed data',
    warning: 'This will run prisma db seed on the server'
  });
}