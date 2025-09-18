import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { FeatureFlag } from '@/lib/types/database-extensions'
import type { ExtendedDatabase } from '@/lib/supabase/types'

// Server-side feature flag service
export class ServerFeatureFlagService {
  private async getSupabase() {
    const cookieStore = await cookies()
    return createServerClient<ExtendedDatabase>(
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
                cookieStore.set(name, value, options)
              })
            } catch {
              // The `set` method was called from a Server Component.
            }
          },
        },
      }
    )
  }

  async getFeatureFlags(): Promise<FeatureFlag[]> {
    const supabase = await this.getSupabase()
    const { data, error } = await supabase
      .from('feature_flags')
      .select('*')
      .order('name')

    if (error) {
      console.error('Error fetching feature flags:', error)
      return []
    }

    return data || []
  }

  async isFeatureEnabled(flagName: string, userTier: 'free' | 'reader' | 'pro' = 'free'): Promise<boolean> {
    const supabase = await this.getSupabase()
    const { data, error } = await supabase
      .from('feature_flags')
      .select('enabled, requires_subscription')
      .eq('name', flagName)
      .single()

    if (error || !data) {
      console.warn(`Feature flag '${flagName}' not found, defaulting to false`)
      return false
    }

    const flag = data as { enabled: boolean; requires_subscription: 'free' | 'reader' | 'pro' }
    
    if (!flag.enabled) {
      return false
    }

    // Check subscription requirement
    const tierHierarchy = { free: 0, reader: 1, pro: 2 }
    const userTierLevel = tierHierarchy[userTier]
    const requiredTierLevel = tierHierarchy[flag.requires_subscription]

    return userTierLevel >= requiredTierLevel
  }
}

export const serverFeatureFlagService = new ServerFeatureFlagService()