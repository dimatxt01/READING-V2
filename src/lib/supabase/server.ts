import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { cache } from 'react'
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

// Use React cache to deduplicate Supabase client requests per render
export const createClient = cache(async () => {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    getSupabaseUrl(),
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              const isProduction = process.env.NODE_ENV === 'production'
              const cookieOptions = {
                ...options,
                sameSite: (isProduction ? 'none' : 'lax') as 'none' | 'lax',
                secure: isProduction,
                ...(isProduction && { domain: '.coolifyai.com' })
              }

              cookieStore.set(name, value, cookieOptions)
            })
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      }
    }
  )
})