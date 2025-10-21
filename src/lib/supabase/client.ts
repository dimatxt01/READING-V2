import { createBrowserClient } from '@supabase/ssr'
import { Database } from '../types/database'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        // Disable auto refresh to prevent infinite loops on token errors
        autoRefreshToken: true,
        persistSession: true,
        // Add retry logic for failed requests
        flowType: 'pkce'
      },
      cookies: {
        get(name: string) {
          // SSR safety check
          if (typeof document === 'undefined') {
            return ''
          }
          const value = document.cookie
            .split('; ')
            .find(row => row.startsWith(name + '='))
            ?.split('=')[1]
          return decodeURIComponent(value || '')
        },
        set(name: string, value: string, options?: { maxAge?: number }) {
          // SSR safety check
          if (typeof document === 'undefined') {
            return
          }

          const maxAge = options?.maxAge || 31536000
          const isLocalhost = typeof window !== 'undefined' &&
            (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')

          if (isLocalhost) {
            // For localhost: use Lax, no domain restriction
            document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`
          } else {
            // For production: check if we're on coolifyai.com domain
            const isCoolifyDomain = window.location.hostname.includes('coolifyai.com')
            const domainPart = isCoolifyDomain ? '; domain=.coolifyai.com' : ''
            document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=None; Secure${domainPart}`
          }
        },
        remove(name: string) {
          // SSR safety check
          if (typeof document === 'undefined') {
            return
          }

          const isLocalhost = typeof window !== 'undefined' &&
            (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')

          if (isLocalhost) {
            // For localhost: use Lax, no domain restriction
            document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`
          } else {
            // For production: check if we're on coolifyai.com domain
            const isCoolifyDomain = window.location.hostname.includes('coolifyai.com')
            const domainPart = isCoolifyDomain ? '; domain=.coolifyai.com' : ''
            document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=None; Secure${domainPart}`
          }
        }
      }
    }
  )
}