import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/utils/logger'

// Internal Supabase URL (not accessible from public internet)
const INTERNAL_SUPABASE_URL = process.env.INTERNAL_SUPABASE_URL || 'http://10.0.1.2:8000'

/**
 * Proxy all Supabase requests to internal instance
 * This handles the case where Supabase is not publicly accessible
 */
async function handleRequest(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> },
  method: string
) {
  try {
    // Await params in Next.js 15
    const params = await context.params

    // Reconstruct the path
    const path = params.path.join('/')
    const targetUrl = `${INTERNAL_SUPABASE_URL}/${path}${req.nextUrl.search}`

    // Log the proxy request for debugging
    logger.debug('Proxying Supabase request', {
      method,
      path,
      targetUrl,
      search: req.nextUrl.search
    })

    // Prepare headers - forward most headers but remove/modify some
    const headers = new Headers()

    // Forward most headers from the original request
    req.headers.forEach((value, key) => {
      // Skip headers that shouldn't be forwarded
      if (
        key.toLowerCase() === 'host' ||
        key.toLowerCase() === 'connection' ||
        key.toLowerCase() === 'transfer-encoding' ||
        key.toLowerCase().startsWith('cf-') || // Cloudflare headers
        key.toLowerCase().startsWith('x-vercel-') // Vercel headers
      ) {
        return
      }
      headers.set(key, value)
    })

    // Set the correct host header for the internal service
    headers.set('host', new URL(INTERNAL_SUPABASE_URL).host)

    // Ensure we have the API key if it exists
    if (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      headers.set('apikey', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    }

    // Prepare request options
    const requestOptions: RequestInit = {
      method,
      headers,
      // Don't follow redirects automatically - let the client handle them
      redirect: 'manual',
    }

    // Add body for methods that support it
    if (method !== 'GET' && method !== 'HEAD') {
      // For POST/PUT/PATCH/DELETE, forward the body
      try {
        // Try to get the raw body
        const body = await req.arrayBuffer()
        if (body.byteLength > 0) {
          requestOptions.body = body

          // Set content-length if not already set
          if (!headers.has('content-length')) {
            headers.set('content-length', body.byteLength.toString())
          }
        }
      } catch (error) {
        logger.warn('Could not read request body', { error })
      }
    }

    // Make the request to the internal Supabase instance
    const response = await fetch(targetUrl, requestOptions)

    // Handle redirects
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location')
      if (location) {
        // If it's a relative redirect, make it relative to our proxy
        if (location.startsWith('/')) {
          const newLocation = `/api/supabase${location}`
          return NextResponse.redirect(new URL(newLocation, req.url), response.status)
        }
        // For absolute URLs, check if they point to the internal Supabase
        if (location.startsWith(INTERNAL_SUPABASE_URL)) {
          const newLocation = location.replace(INTERNAL_SUPABASE_URL, '/api/supabase')
          return NextResponse.redirect(new URL(newLocation, req.url), response.status)
        }
      }
    }

    // Create response headers
    const responseHeaders = new Headers()

    // Forward most response headers
    response.headers.forEach((value, key) => {
      // Skip headers that shouldn't be forwarded
      if (
        key.toLowerCase() === 'connection' ||
        key.toLowerCase() === 'transfer-encoding' ||
        key.toLowerCase() === 'content-encoding' || // Let Next.js handle compression
        key.toLowerCase() === 'content-length' // Will be recalculated
      ) {
        return
      }
      responseHeaders.set(key, value)
    })

    // Add CORS headers if needed
    responseHeaders.set('Access-Control-Allow-Origin', '*')
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS')
    responseHeaders.set('Access-Control-Allow-Headers', '*')

    // Get the response body
    const responseBody = await response.arrayBuffer()

    // Return the proxied response
    return new NextResponse(responseBody, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    })

  } catch (error) {
    logger.error('Supabase proxy error', {
      method,
      path: context.params ? (await context.params).path : 'unknown',
      error: error instanceof Error ? error.message : 'Unknown error',
    })

    // Return error response
    return NextResponse.json(
      {
        error: 'Internal proxy error',
        message: error instanceof Error ? error.message : 'Failed to proxy request to Supabase',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 502 } // Bad Gateway
    )
  }
}

// Export all HTTP methods
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return handleRequest(req, context, 'GET')
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return handleRequest(req, context, 'POST')
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return handleRequest(req, context, 'PUT')
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return handleRequest(req, context, 'DELETE')
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return handleRequest(req, context, 'PATCH')
}

export async function OPTIONS(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  // Handle preflight requests
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Max-Age': '86400',
    },
  })
}

export async function HEAD(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return handleRequest(req, context, 'HEAD')
}