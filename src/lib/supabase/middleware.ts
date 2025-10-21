import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { Database } from '../types/database'
import { logger } from '../utils/logger'
import { handleAuthError, validateSupabaseConfig } from './auth-error-handler'

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

// Cached security modules
let cachedModules: {
  rateLimiters: { api: RateLimiter }
  SecurityHeaders: SecurityModule
  enforceHTTPS: (req: NextRequest) => NextResponse | null
  logSecurityEvent: (event: string, req: NextRequest, details?: Record<string, unknown>) => void
  loaded: boolean
} | null = null

// Load security modules lazily without top-level await
async function getSecurityModules() {
  if (cachedModules && cachedModules.loaded) {
    return cachedModules
  }

  try {
    const [rateModule, headerModule] = await Promise.all([
      import('../security/rate-limiting'),
      import('../security/headers')
    ])

    cachedModules = {
      rateLimiters: rateModule.rateLimiters,
      SecurityHeaders: headerModule.SecurityHeaders,
      enforceHTTPS: headerModule.enforceHTTPS,
      logSecurityEvent: headerModule.logSecurityEvent as (event: string, req: NextRequest, details?: Record<string, unknown>) => void,
      loaded: true
    }
  } catch {
    // Fallback implementations if security modules are not available
    cachedModules = {
      rateLimiters: { api: { isAllowed: async () => ({ allowed: true }) } },
      SecurityHeaders: { getSecurityHeaders: () => ({}) },
      enforceHTTPS: () => null,
      logSecurityEvent: () => {},
      loaded: true
    }
  }

  return cachedModules
}

export async function updateSession(request: NextRequest) {
  // Validate Supabase configuration
  const configValidation = validateSupabaseConfig()
  if (!configValidation.valid) {
    logger.error('Invalid Supabase configuration', { missing: configValidation.missing })
    return NextResponse.redirect(new URL('/auth/login?error=config', request.url))
  }

  // Load security modules lazily
  const { rateLimiters, SecurityHeaders, enforceHTTPS, logSecurityEvent } = await getSecurityModules()

  // Enforce HTTPS in production
  const httpsRedirect = enforceHTTPS(request)
  if (httpsRedirect) return httpsRedirect
  // Apply rate limiting for API routes
  const pathname = request.nextUrl.pathname
  if (pathname.startsWith('/api/')) {
    const rateLimitResult = await rateLimiters.api.isAllowed(request)
    if (!rateLimitResult.allowed) {
      logger.warn('Rate limit exceeded', {
        path: pathname,
        limit: rateLimitResult.limit,
        current: rateLimitResult.current
      })
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
          const isProduction = process.env.NODE_ENV === 'production'
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) => {
            const cookieOptions = {
              ...options,
              sameSite: isProduction ? 'lax' : 'lax',
              secure: isProduction,
              httpOnly: true
            };

            // Only set domain if we're on the coolifyai.com domain
            const hostname = request.headers.get('host') || '';
            if (isProduction && hostname.includes('coolifyai.com')) {
              Object.assign(cookieOptions, { domain: '.coolifyai.com' });
            } else if (isProduction) {
              // For other production domains, don't set domain to avoid cookie issues
              delete cookieOptions.domain;
            }

            supabaseResponse.cookies.set(name, value, {
              ...cookieOptions,
              sameSite: cookieOptions.sameSite as 'none' | 'lax' | 'strict' | undefined
            });
          })
        },
      }
    }
  )

  // Handle auth code/token parameters - redirect to callback if present
  const code = request.nextUrl.searchParams.get('code')
  const token = request.nextUrl.searchParams.get('token')
  const token_hash = request.nextUrl.searchParams.get('token_hash')

  if ((code || token || token_hash) && !pathname.startsWith('/auth/callback')) {
    // Preserve all query parameters and redirect to callback
    const callbackUrl = new URL('/auth/callback', request.url)
    request.nextUrl.searchParams.forEach((value, key) => {
      callbackUrl.searchParams.set(key, value)
    })
    logger.debug('Redirecting to auth callback', { from: pathname })
    return NextResponse.redirect(callbackUrl)
  }

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  let user = null;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      const sessionCleared = await handleAuthError(
        { message: error.message, status: error.status, code: error.code },
        supabase,
        'middleware-getUser'
      );
      
      if (sessionCleared) {
        logger.info('Session cleared due to auth error, redirecting to login');
        // Only redirect if we're not already on the login page to prevent loops
        if (request.nextUrl.pathname !== '/auth/login') {
          return NextResponse.redirect(new URL('/auth/login?error=session_expired', request.url));
        }
      }
    } else {
      user = data?.user;
    }
  } catch (error) {
    const sessionCleared = await handleAuthError(
      { 
        message: error instanceof Error ? error.message : 'Unknown error',
        status: 0,
        code: 'network_error'
      },
      supabase,
      'middleware-getUser-catch'
    );
    
    if (sessionCleared) {
      logger.info('Session cleared due to network error, redirecting to login');
      // Only redirect if we're not already on the login page to prevent loops
      if (request.nextUrl.pathname !== '/auth/login') {
        return NextResponse.redirect(new URL('/auth/login?error=network_error', request.url));
      }
    }
    
    // Continue without user - treat as unauthenticated
  }

  // Debug logging
  logger.debug('Middleware processing request', {
    pathname: request.nextUrl.pathname,
    authenticated: !!user
  })

  // Admin route protection
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!user) {
      logger.info('Redirecting unauthenticated admin access', { pathname })
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
        logger.warn('Non-admin attempted admin access', { userId: user.id, pathname })
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
        logger.debug('Admin activity logging not available')
      }

      logger.debug('Admin access granted', { pathname: request.nextUrl.pathname })
    } catch (error) {
      logger.error('Error checking admin role', error)
      return NextResponse.redirect(new URL('/dashboard?error=access_denied', request.url))
    }
  }

  // If user is signed in and the current path is /login or root, redirect the user to /dashboard
  // Allow /auth/verify-otp for users who just authenticated
  if (user && (request.nextUrl.pathname === '/auth/login' || request.nextUrl.pathname === '/')) {
    logger.debug('Redirecting authenticated user to dashboard')
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // If user is not signed in and the current path is not an auth route or root, redirect to login
  // BUT: Don't redirect if we're already on the login page with an error parameter (prevents redirect loops)
  const isLoginPageWithError = request.nextUrl.pathname === '/auth/login' && 
    (request.nextUrl.searchParams.has('error') || request.nextUrl.searchParams.has('code'))
  
  if (!user && !request.nextUrl.pathname.startsWith('/auth') && request.nextUrl.pathname !== '/' && !isLoginPageWithError) {
    logger.debug('Redirecting unauthenticated user to login')
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