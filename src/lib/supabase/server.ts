import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { cache } from 'react'
import { Database } from '../types/database'

// Use React cache to deduplicate Supabase client requests per render
export const createClient = cache(async () => {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
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
              cookieStore.set(name, value, {
                ...options,
                sameSite: isProduction ? 'none' : 'lax',
                secure: isProduction,
                ...(isProduction && { domain: '.coolifyai.com' })
              })
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