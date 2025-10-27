import { NextRequest, NextResponse } from 'next/server'

/**
 * Test endpoint to verify Supabase proxy is working
 * Access at: /api/supabase-test
 */
export async function GET(req: NextRequest) {
  const tests = []

  // Test 1: Check environment variables
  tests.push({
    test: 'Environment Variables',
    public_url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    internal_url: process.env.INTERNAL_SUPABASE_URL ? '✅ Set' : '❌ Missing',
    anon_key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing',
  })

  // Test 2: Try to reach internal Supabase
  if (process.env.INTERNAL_SUPABASE_URL) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 5000) // 5 second timeout

      const response = await fetch(
        `${process.env.INTERNAL_SUPABASE_URL}/rest/v1/`,
        {
          method: 'GET',
          headers: {
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
          },
          signal: controller.signal,
        }
      )
      clearTimeout(timeout)

      tests.push({
        test: 'Internal Supabase Connection',
        status: response.status,
        statusText: response.statusText,
        result: response.ok ? '✅ Connected' : '⚠️ Connected but error',
      })
    } catch (error) {
      tests.push({
        test: 'Internal Supabase Connection',
        error: error instanceof Error ? error.message : 'Unknown error',
        result: '❌ Failed',
        hint: 'Check INTERNAL_SUPABASE_URL and network connectivity',
      })
    }
  }

  // Test 3: Try proxy endpoint
  try {
    const proxyUrl = new URL('/api/supabase/rest/v1/', req.url)
    const response = await fetch(proxyUrl.toString(), {
      headers: {
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      },
    })

    tests.push({
      test: 'Proxy Endpoint',
      url: proxyUrl.pathname,
      status: response.status,
      result: response.ok ? '✅ Working' : '⚠️ Not working properly',
    })
  } catch (error) {
    tests.push({
      test: 'Proxy Endpoint',
      error: error instanceof Error ? error.message : 'Unknown error',
      result: '❌ Failed',
    })
  }

  // Test 4: Configuration recommendations
  const recommendations = []

  if (process.env.NEXT_PUBLIC_SUPABASE_URL !== '/api/supabase') {
    recommendations.push('Set NEXT_PUBLIC_SUPABASE_URL=/api/supabase')
  }

  if (!process.env.INTERNAL_SUPABASE_URL) {
    recommendations.push('Set INTERNAL_SUPABASE_URL=http://10.0.1.2:8000 (or your internal URL)')
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    tests,
    recommendations: recommendations.length > 0 ? recommendations : ['✅ Configuration looks good'],
    instructions: {
      1: 'Make sure NEXT_PUBLIC_SUPABASE_URL=/api/supabase',
      2: 'Set INTERNAL_SUPABASE_URL to your internal Supabase instance',
      3: 'Ensure your deployment can reach the internal Supabase URL',
      4: 'Rebuild and deploy after changing environment variables',
    },
  }, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  })
}