import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { Database } from '../types/database'
import { logger } from '../utils/logger'

/**
 * Get the Supabase URL, handling relative proxy URLs
 */
function getSupabaseUrl(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!

  // If it's a relative URL (proxy), convert to absolute URL
  if (url.startsWith('/')) {
    // Use the request URL to build the absolute URL
    const protocol = request.headers.get('x-forwarded-proto') || 'https'
    const host = request.headers.get('host') || 'placeholder.supabase.co'
    return `${protocol}://${host}${url}`
  }

  return url
}

/**
 * Simplified middleware that ONLY refreshes sessions
 * Does NOT make routing decisions - those are handled by server components
 */
export async function updateSession(request: NextRequest) {
  // Create a response object that we can modify
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  try {
    // Create Supabase client with proper cookie handling
    const supabase = createServerClient<Database>(
      getSupabaseUrl(request),
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            // Set cookie on request for subsequent middleware
            request.cookies.set({
              name,
              value,
              ...options,
            })

            // Set cookie on response to send to client
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            })

            response.cookies.set({
              name,
              value,
              ...options,
              // Ensure consistent cookie settings
              sameSite: 'lax', // Use 'lax' for same-site navigation
              secure: process.env.NODE_ENV === 'production',
              httpOnly: true, // Security best practice
            })
          },
          remove(name: string, options: CookieOptions) {
            // Remove cookie from request
            request.cookies.set({
              name,
              value: '',
              ...options,
            })

            // Remove cookie from response
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            })

            response.cookies.set({
              name,
              value: '',
              ...options,
              maxAge: 0,
              sameSite: 'lax',
              secure: process.env.NODE_ENV === 'production',
              httpOnly: true,
            })
          },
        },
      },
    )

    // Simply refresh the session - don't make routing decisions
    // This ensures cookies are up to date
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error) {
      // Log the error but don't redirect
      // Let the page handle what to do with unauthenticated users
      logger.debug('Session refresh error in middleware', {
        error: error.message,
        path: request.nextUrl.pathname,
      })
    } else if (user) {
      // Session is valid, log for debugging
      logger.debug('Session refreshed successfully', {
        userId: user.id,
        path: request.nextUrl.pathname,
      })
    } else {
      // No user session, but that's okay
      // Public pages don't need authentication
      logger.debug('No user session', {
        path: request.nextUrl.pathname,
      })
    }

    // Always return the response with updated cookies
    return response

  } catch (error) {
    // If something goes wrong, log it but don't break the request
    logger.error('Middleware error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      path: request.nextUrl.pathname,
    })

    // Return the original response
    return response
  }
}