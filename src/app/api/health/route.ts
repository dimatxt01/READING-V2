import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'edge';

export async function GET() {
  try {
    // Basic health check
    const checks: {
      status: string;
      timestamp: string;
      uptime: number;
      memory: ReturnType<typeof process.memoryUsage> | Record<string, never>;
      environment: string | undefined;
      supabase?: string;
    } = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime ? process.uptime() : 0,
      memory: process.memoryUsage ? process.memoryUsage() : {},
      environment: process.env.NODE_ENV,
    };

    // Check Supabase connectivity (optional, can be removed if causing issues)
    try {
      const supabase = await createClient();
      // Simple auth check - doesn't require database query
      await supabase.auth.getSession();
      checks.supabase = 'connected';
    } catch {
      // Don't fail health check if Supabase is temporarily unavailable
      checks.supabase = 'unavailable';
    }

    return NextResponse.json(checks, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      {
        status: 503,
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  }
}