import { createBrowserClient } from '@supabase/ssr'
import { Database } from '../types/database'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          const value = document.cookie
            .split('; ')
            .find(row => row.startsWith(name + '='))
            ?.split('=')[1]
          return decodeURIComponent(value || '')
        },
        set(name: string, value: string) {
          const cookieString = `${name}=${encodeURIComponent(value)}; path=/; max-age=31536000; SameSite=None; Secure; Domain=.coolifyai.com`
          document.cookie = cookieString
        },
        remove(name: string) {
          document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=None; Secure; Domain=.coolifyai.com`
        }
      }
    }
  )
}