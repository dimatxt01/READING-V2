import { createBrowserClient } from '@supabase/ssr'
import { Database } from '../types/database'

/**
 * Simplified client-side Supabase client
 * Let Supabase handle all cookie management
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
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