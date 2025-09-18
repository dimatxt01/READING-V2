import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { Database } from '../types/database'

// Import security utilities (fallback to no-op if not available)
interface RateLimitResult {
  allowed: boolean
  limit?: number
  current?: number
  remaining?: number
}

interface SecurityModule {
  getSecurityHeaders: () => Record<string, string>
}

interface RateLimiter {
  isAllowed: (req: NextRequest) => Promise<RateLimitResult>
}

let rateLimiters: { api: RateLimiter }
let SecurityHeaders: SecurityModule
let enforceHTTPS: (req: NextRequest) => NextResponse | null
let logSecurityEvent: (event: string, req: NextRequest, details?: Record<string, unknown>) => void

try {
  const rateModule = await import('../security/rate-limiting')
  const headerModule = await import('../security/headers')
  rateLimiters = rateModule.rateLimiters
  SecurityHeaders = headerModule.SecurityHeaders
  enforceHTTPS = headerModule.enforceHTTPS
  logSecurityEvent = headerModule.logSecurityEvent as (event: string, req: NextRequest, details?: Record<string, unknown>) => void
} catch {
  // Fallback implementations
  rateLimiters = { api: { isAllowed: async () => ({ allowed: true }) } }
  SecurityHeaders = { getSecurityHeaders: () => ({}) }
  enforceHTTPS = () => null
  logSecurityEvent = () => {}
}

export async function updateSession(request: NextRequest) {
  // Enforce HTTPS in production
  const httpsRedirect = enforceHTTPS(request)
  if (httpsRedirect) return httpsRedirect
  // Apply rate limiting for API routes
  const pathname = request.nextUrl.pathname
  if (pathname.startsWith('/api/')) {
    const rateLimitResult = await rateLimiters.api.isAllowed(request)
    if (!rateLimitResult.allowed) {
      logSecurityEvent('rate_limit', request, { 
        limit: rateLimitResult.limit,
        current: rateLimitResult.current 
      })
      
      return new NextResponse(
        JSON.stringify({
          error: 'Too many requests',
          message: 'Rate limit exceeded. Please try again later.',
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': rateLimitResult.limit?.toString() || '100',
            'X-RateLimit-Remaining': rateLimitResult.remaining?.toString() || '0',
            'Retry-After': '60',
            ...SecurityHeaders.getSecurityHeaders()
          }
        }
      )
    }
  }

  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Debug logging
  console.log(`Middleware: ${request.nextUrl.pathname}, User: ${user ? 'authenticated' : 'not authenticated'}`)

  // Admin route protection
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!user) {
      console.log('Redirecting unauthenticated user from admin to login')
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }

    // Check admin role
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (error || profile?.role !== 'admin') {
        console.log('Redirecting non-admin user from admin area')
        return NextResponse.redirect(new URL('/dashboard?error=unauthorized', request.url))
      }

      // Log admin access (optional, when logging table exists)
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).from('admin_activity_log').insert({
          admin_id: user.id,
          action: 'admin_page_access',
          entity_type: 'system',
          entity_id: null,
          details: {
            path: request.nextUrl.pathname,
            user_agent: request.headers.get('user-agent'),
            ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
            timestamp: new Date().toISOString()
          }
        })
      } catch {
        // Ignore logging errors (table might not exist yet)
        console.debug('Admin activity logging not available')
      }

      console.log(`Admin access granted to ${request.nextUrl.pathname}`)
    } catch (error) {
      console.error('Error checking admin role:', error)
      return NextResponse.redirect(new URL('/dashboard?error=access_denied', request.url))
    }
  }

  // If user is signed in and the current path is /login or root, redirect the user to /dashboard
  if (user && (request.nextUrl.pathname === '/auth/login' || request.nextUrl.pathname === '/')) {
    console.log('Redirecting authenticated user to dashboard')
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // If user is not signed in and the current path is not an auth route or root, redirect to login
  if (!user && !request.nextUrl.pathname.startsWith('/auth') && request.nextUrl.pathname !== '/') {
    console.log('Redirecting unauthenticated user to login')
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
  // creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely.

  // Apply security headers to all responses
  const securityHeaders = SecurityHeaders.getSecurityHeaders()
  Object.entries(securityHeaders).forEach(([key, value]) => {
    if (value) {
      supabaseResponse.headers.set(key, value)
    }
  })

  return supabaseResponse
}