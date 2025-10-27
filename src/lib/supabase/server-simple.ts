import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '../types/database'

/**
 * Get the Supabase URL, handling relative proxy URLs
 */
function getSupabaseUrl() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!

  // If it's a relative URL (proxy), convert to absolute URL
  if (url.startsWith('/')) {
    // For server-side, use the app URL or a placeholder
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://placeholder.supabase.co'
    // Remove trailing slash from appUrl if present
    const baseUrl = appUrl.endsWith('/') ? appUrl.slice(0, -1) : appUrl
    return `${baseUrl}${url}`
  }

  return url
}

/**
 * Simplified server-side Supabase client
 * Consistent cookie handling with middleware
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    getSupabaseUrl(),
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({
              name,
              value,
              ...options,
              // Consistent settings with middleware
              sameSite: 'lax',
              secure: process.env.NODE_ENV === 'production',
              httpOnly: true,
            })
          } catch {
            // The `set` method was called from a Server Component
            // This can be ignored if middleware is refreshing sessions
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({
              name,
              value: '',
              ...options,
              maxAge: 0,
              sameSite: 'lax',
              secure: process.env.NODE_ENV === 'production',
              httpOnly: true,
            })
          } catch {
            // The `remove` method was called from a Server Component
            // This can be ignored
          }
        },
      },
    }
  )
}