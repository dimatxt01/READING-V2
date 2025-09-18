'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  getUserTier, 
  getUserUsageSummary, 
  checkUserLimits, 
  canUserAccessFeature,
  SubscriptionLimits,
  MonthlyUsage
} from '@/lib/services/subscriptions'

export interface UseSubscriptionReturn {
  tier: string
  limits: SubscriptionLimits | null
  usage: MonthlyUsage | null
  canSubmit: boolean
  canCreateCustomText: boolean
  remainingSubmissions?: number
  remainingCustomTexts?: number
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

/**
 * Hook to get user's subscription information and usage
 */
export function useSubscription(): UseSubscriptionReturn {
  const [data, setData] = useState<Omit<UseSubscriptionReturn, 'loading' | 'error' | 'refresh'>>({
    tier: 'free',
    limits: null,
    usage: null,
    canSubmit: false,
    canCreateCustomText: false
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setError('Not authenticated')
        return
      }

      const summary = await getUserUsageSummary(user.id)
      setData(summary)
    } catch (err) {
      console.error('Error fetching subscription data:', err)
      setError('Failed to load subscription information')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  return {
    ...data,
    loading,
    error,
    refresh: fetchData
  }
}

/**
 * Hook to check if user can perform a specific action
 */
export function useCanPerformAction(action: 'submission' | 'custom_text' | 'exercise' | 'leaderboard_view' | 'leaderboard_join' | 'book_stats' | 'data_export') {
  const [canPerform, setCanPerform] = useState(false)
  const [loading, setLoading] = useState(true)
  const [usage, setUsage] = useState<{ current: number; limit: number | null } | null>(null)

  useEffect(() => {
    const checkPermission = async () => {
      try {
        setLoading(true)
        
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          setCanPerform(false)
          return
        }

        const tier = await getUserTier(user.id)
        const result = await checkUserLimits(user.id, tier, action)
        
        setCanPerform(result.allowed)
        setUsage(result.usage || null)
      } catch (error) {
        console.error('Error checking action permission:', error)
        setCanPerform(false)
      } finally {
        setLoading(false)
      }
    }

    checkPermission()
  }, [action])

  return { canPerform, loading, usage }
}

/**
 * Hook to check feature access
 */
export function useFeatureAccess(feature: 'leaderboard_view' | 'leaderboard_join' | 'book_stats' | 'data_export') {
  const [hasAccess, setHasAccess] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAccess = async () => {
      try {
        setLoading(true)
        
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          setHasAccess(false)
          return
        }

        const access = await canUserAccessFeature(user.id, feature)
        setHasAccess(access)
      } catch (error) {
        console.error('Error checking feature access:', error)
        setHasAccess(false)
      } finally {
        setLoading(false)
      }
    }

    checkAccess()
  }, [feature])

  return { hasAccess, loading }
}

/**
 * Hook to get user's tier only
 */
export function useUserTier() {
  const [tier, setTier] = useState<string>('free')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTier = async () => {
      try {
        setLoading(true)
        
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          setTier('free')
          return
        }

        const userTier = await getUserTier(user.id)
        setTier(userTier)
      } catch (error) {
        console.error('Error fetching user tier:', error)
        setTier('free')
      } finally {
        setLoading(false)
      }
    }

    fetchTier()
  }, [])

  return { tier, loading }
}

/**
 * Hook for subscription usage tracking
 */
export function useUsageTracking() {
  const trackUsage = async (
    action: 'submission' | 'custom_text' | 'exercise',
    metadata?: Record<string, unknown>
  ) => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error('Not authenticated')
      }

      // Import here to avoid circular dependencies
      const { trackUsage: trackUsageService } = await import('@/lib/services/subscriptions')
      return await trackUsageService(user.id, action, metadata)
    } catch (error) {
      console.error('Error tracking usage:', error)
      return false
    }
  }

  return { trackUsage }
}

/**
 * Helper hook to check if user is on a specific tier
 */
export function useIsTier(targetTier: 'free' | 'reader' | 'pro') {
  const { tier, loading } = useUserTier()
  return { 
    isTier: tier === targetTier, 
    loading,
    tier 
  }
}

/**
 * Helper hook to check if user has premium access (reader or pro)
 */
export function useHasPremium() {
  const { tier, loading } = useUserTier()
  return { 
    hasPremium: tier === 'reader' || tier === 'pro', 
    loading,
    tier 
  }
}

/**
 * Hook to get tier hierarchy comparison
 */
export function useTierComparison() {
  const { tier, loading } = useUserTier()
  
  const tierLevels = {
    free: 0,
    reader: 1,
    pro: 2
  }

  const isAtLeast = (targetTier: 'free' | 'reader' | 'pro') => {
    return tierLevels[tier as keyof typeof tierLevels] >= tierLevels[targetTier]
  }

  const isExactly = (targetTier: 'free' | 'reader' | 'pro') => {
    return tier === targetTier
  }

  return {
    tier,
    loading,
    isAtLeast,
    isExactly,
    isFree: tier === 'free',
    isReader: tier === 'reader',
    isPro: tier === 'pro',
    hasPremium: tier === 'reader' || tier === 'pro'
  }
}