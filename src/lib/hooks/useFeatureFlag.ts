'use client'

import { useState, useEffect } from 'react'
import { featureFlagService } from '@/lib/services/featureFlags'
import { createClient } from '@/lib/supabase/client'

interface UseFeatureFlagResult {
  isEnabled: boolean
  isLoading: boolean
  error: string | null
}

/**
 * Hook to check if a feature flag is enabled for the current user
 * @param flagName - The name of the feature flag to check
 * @param userTier - The subscription tier of the user (defaults to 'free')
 * @returns Object containing isEnabled status, loading state, and error
 */
export function useFeatureFlag(
  flagName: string, 
  userTier: 'free' | 'reader' | 'pro' = 'free'
): UseFeatureFlagResult {
  const [isEnabled, setIsEnabled] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    const checkFeatureFlag = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        const enabled = await featureFlagService.isFeatureEnabled(flagName, userTier)
        
        if (mounted) {
          setIsEnabled(enabled)
        }
      } catch (err) {
        console.error(`Error checking feature flag '${flagName}':`, err)
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Unknown error')
          setIsEnabled(false) // Default to disabled on error
        }
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    checkFeatureFlag()

    return () => {
      mounted = false
    }
  }, [flagName, userTier])

  return { isEnabled, isLoading, error }
}

/**
 * Hook to get the current user's subscription tier
 * @returns The user's subscription tier or 'free' as default
 */
export function useUserTier(): 'free' | 'reader' | 'pro' {
  const [userTier, setUserTier] = useState<'free' | 'reader' | 'pro'>('free')
  const supabase = createClient()

  useEffect(() => {
    let mounted = true

    const getUserTier = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (user) {
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('subscription_tier')
            .eq('id', user.id)
            .single()

          if (!error && profile && mounted) {
            setUserTier((profile.subscription_tier as 'free' | 'reader' | 'pro') || 'free')
          }
        }
      } catch (error) {
        console.error('Error getting user tier:', error)
        // Default to 'free' on error
      }
    }

    getUserTier()

    return () => {
      mounted = false
    }
  }, [supabase])

  return userTier
}

/**
 * Combined hook that checks feature flag with automatic user tier detection
 * @param flagName - The name of the feature flag to check
 * @returns Object containing isEnabled status, loading state, and error
 */
export function useFeatureFlagWithUserTier(flagName: string): UseFeatureFlagResult {
  const userTier = useUserTier()
  return useFeatureFlag(flagName, userTier)
}