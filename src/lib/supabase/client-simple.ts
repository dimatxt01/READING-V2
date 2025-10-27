import { createBrowserClient } from '@supabase/ssr'
import { Database } from '../types/database'

/**
 * Get the Supabase URL, handling relative proxy URLs
 */
function getSupabaseUrl() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!

  // If it's a relative URL (proxy), convert to absolute URL
  if (url.startsWith('/')) {
    // During SSR/build, we need a full URL
    if (typeof window === 'undefined') {
      // Use a dummy URL for build time - the proxy will handle actual requests
      return 'https://placeholder.supabase.co'
    }
    // In browser, use the current origin
    return `${window.location.origin}${url}`
  }

  return url
}

/**
 * Simplified client-side Supabase client
 * Let Supabase handle all cookie management
 */
export function createClient() {
  return createBrowserClient<Database>(
    getSupabaseUrl(),
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        // Let Supabase handle everything
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
      // Don't override cookie handling - let Supabase do it correctly
    }
  )
}