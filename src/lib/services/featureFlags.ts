import { createTypedAdminClient } from '@/lib/supabase/typed-client'
import type { FeatureFlagsRow, FeatureFlagsInsert } from '@/lib/supabase/typed-client'
import type { FeatureFlag } from '@/lib/types/database-extensions'
import type { Json } from '@/lib/types/database'

export type { FeatureFlag }

export interface FeatureFlagUpdate {
  enabled?: boolean
  requires_subscription?: 'free' | 'reader' | 'pro'
  description?: string
  metadata?: Record<string, unknown>
}

// Client-side feature flag service
export class FeatureFlagService {
  private adminClient = createTypedAdminClient()

  async getFeatureFlags(): Promise<FeatureFlag[]> {
    const { data, error } = await this.adminClient
      .from('feature_flags')
      .select('*')
      .order('name')

    if (error) {
      console.error('Error fetching feature flags:', error)
      throw error
    }

    return data || []
  }

  async isFeatureEnabled(flagName: string, userTier: 'free' | 'reader' | 'pro' = 'free'): Promise<boolean> {
    const { data, error } = await this.adminClient
      .from('feature_flags')
      .select('enabled, requires_subscription')
      .eq('name', flagName)
      .single()

    if (error || !data) {
      console.warn(`Feature flag '${flagName}' not found, defaulting to false`)
      return false
    }

    const flag = data as Pick<FeatureFlagsRow, 'enabled' | 'requires_subscription'>
    
    if (!flag.enabled) {
      return false
    }

    // Check subscription requirement
    const tierHierarchy: Record<string, number> = { free: 0, reader: 1, pro: 2 }
    const userTierLevel = tierHierarchy[userTier]
    const requiredTierLevel = flag.requires_subscription ? tierHierarchy[flag.requires_subscription] : 0

    return userTierLevel >= requiredTierLevel
  }

  async updateFeatureFlag(flagName: string, updates: FeatureFlagUpdate): Promise<void> {
    const updateData = {
      ...updates,
      metadata: updates.metadata as Json,
      updated_at: new Date().toISOString()
    }
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (this.adminClient as any)
      .from('feature_flags')
      .update(updateData)
      .eq('name', flagName)

    if (error) {
      console.error('Error updating feature flag:', error)
      throw error
    }
  }

  async createFeatureFlag(flag: Omit<FeatureFlag, 'id' | 'created_at' | 'updated_at'>): Promise<void> {
    const insertData: FeatureFlagsInsert = {
      ...flag,
      metadata: flag.metadata as Json,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (this.adminClient as any)
      .from('feature_flags')
      .insert(insertData)

    if (error) {
      console.error('Error creating feature flag:', error)
      throw error
    }
  }

  async deleteFeatureFlag(flagName: string): Promise<void> {
    const { error } = await this.adminClient
      .from('feature_flags')
      .delete()
      .eq('name', flagName)

    if (error) {
      console.error('Error deleting feature flag:', error)
      throw error
    }
  }
}

// Singleton instance
export const featureFlagService = new FeatureFlagService()