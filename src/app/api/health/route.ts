import { NextResponse } from 'next/server';

// Remove edge runtime to use Node.js runtime for better compatibility
// export const runtime = 'edge';

export async function GET() {
  // Simple health check - just return OK
  // Avoid complex checks that might fail during deployment
  return NextResponse.json(
    {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    }
  );
}