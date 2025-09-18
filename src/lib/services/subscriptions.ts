import { createTypedClient, createTypedAdminClient } from '@/lib/supabase/typed-client'
import type {
  UserMonthlyUsageRow,
  UserMonthlyUsageInsert,
  UserMonthlyUsageUpdate
} from '@/lib/supabase/typed-client'
import type {
  SubscriptionLimits,
  UserSubscription,
  UserMonthlyUsage as MonthlyUsage
} from '@/lib/types/database-extensions'

export type { SubscriptionLimits, UserSubscription, MonthlyUsage }

/**
 * Get subscription limits for a specific tier
 */
export async function getSubscriptionLimits(tier: string): Promise<SubscriptionLimits | null> {
  const adminClient = createTypedAdminClient()

  try {
    const { data, error } = await adminClient
      .from('subscription_limits')
      .select('*')
      .eq('tier', tier)
      .single()

    if (error) {
      console.error('Error fetching subscription limits:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error in getSubscriptionLimits:', error)
    return null
  }
}

/**
 * Get all subscription limits
 */
export async function getAllSubscriptionLimits(): Promise<SubscriptionLimits[]> {
  const adminClient = createTypedAdminClient()

  try {
    const { data, error } = await adminClient
      .from('subscription_limits')
      .select('*')
      .order('tier')

    if (error) {
      console.error('Error fetching all subscription limits:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error in getAllSubscriptionLimits:', error)
    return []
  }
}

/**
 * Get user's current subscription details
 */
export async function getUserSubscription(userId: string): Promise<UserSubscription | null> {
  const adminClient = createTypedAdminClient()

  try {
    const { data, error } = await adminClient
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching user subscription:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error in getUserSubscription:', error)
    return null
  }
}

/**
 * Get user's monthly usage for the current month
 */
export async function getUserMonthlyUsage(userId: string): Promise<MonthlyUsage | null> {
  const adminClient = createTypedAdminClient()

  try {
    const currentMonth = new Date().toISOString().slice(0, 7) + '-01' // YYYY-MM-01

    const { data, error } = await adminClient
      .from('user_monthly_usage')
      .select('*')
      .eq('user_id', userId)
      .eq('month', currentMonth)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching monthly usage:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error in getUserMonthlyUsage:', error)
    return null
  }
}

/**
 * Check if user can perform an action based on their subscription and usage
 */
export async function checkUserLimits(
  userId: string, 
  tier: string, 
  action: 'submission' | 'custom_text' | 'exercise' | 'leaderboard_view' | 'leaderboard_join' | 'book_stats' | 'data_export'
): Promise<{ allowed: boolean; reason?: string; usage?: { current: number; limit: number | null } }> {
  try {
    // Get subscription limits for the tier
    const limits = await getSubscriptionLimits(tier)
    if (!limits) {
      return { allowed: false, reason: 'Invalid subscription tier' }
    }

    // Check feature-based permissions first
    switch (action) {
      case 'leaderboard_view':
        return { allowed: limits.can_see_leaderboard }
      case 'leaderboard_join':
        return { allowed: limits.can_join_leaderboard }
      case 'book_stats':
        return { allowed: limits.can_see_book_stats }
      case 'data_export':
        return { allowed: limits.can_export_data }
    }

    // For usage-based checks, get current monthly usage
    const usage = await getUserMonthlyUsage(userId)

    switch (action) {
      case 'submission':
        if (limits.max_submissions_per_month === null) {
          return { allowed: true } // Unlimited
        }
        const submissionCount = usage?.submission_count || 0
        return {
          allowed: submissionCount < limits.max_submissions_per_month,
          reason: submissionCount >= limits.max_submissions_per_month 
            ? `Monthly submission limit reached (${limits.max_submissions_per_month})` 
            : undefined,
          usage: { current: submissionCount, limit: limits.max_submissions_per_month }
        }

      case 'custom_text':
        if (limits.max_custom_texts === null) {
          return { allowed: true } // Unlimited
        }
        const customTextCount = usage?.custom_texts_count || 0
        return {
          allowed: customTextCount < limits.max_custom_texts,
          reason: customTextCount >= limits.max_custom_texts 
            ? `Custom text limit reached (${limits.max_custom_texts})` 
            : undefined,
          usage: { current: customTextCount, limit: limits.max_custom_texts }
        }

      case 'exercise':
        if (limits.max_exercises === null) {
          return { allowed: true } // Unlimited
        }
        const exercisesUsed = usage?.exercises_used?.length || 0
        return {
          allowed: exercisesUsed < limits.max_exercises,
          reason: exercisesUsed >= limits.max_exercises 
            ? `Exercise limit reached (${limits.max_exercises})` 
            : undefined,
          usage: { current: exercisesUsed, limit: limits.max_exercises }
        }

      default:
        return { allowed: false, reason: 'Unknown action' }
    }
  } catch (error) {
    console.error('Error checking user limits:', error)
    return { allowed: false, reason: 'Error checking limits' }
  }
}

/**
 * Track usage for a user action
 */
export async function trackUsage(
  userId: string,
  action: 'submission' | 'custom_text' | 'exercise',
  metadata?: Record<string, unknown>
): Promise<boolean> {
  const adminClient = createTypedAdminClient()

  try {
    const currentMonth = new Date().toISOString().slice(0, 7) + '-01' // YYYY-MM-01

    // Get or create monthly usage record
    const { data: existingUsage, error: fetchError } = await adminClient
      .from('user_monthly_usage')
      .select('*')
      .eq('user_id', userId)
      .eq('month', currentMonth)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching usage:', fetchError)
      return false
    }

    const usage = existingUsage as UserMonthlyUsageRow | null

    const updateData: Partial<UserMonthlyUsageUpdate> = {
      updated_at: new Date().toISOString()
    }

    if (action === 'submission') {
      updateData.submission_count = (usage?.submission_count || 0) + 1
    } else if (action === 'custom_text') {
      updateData.custom_texts_count = (usage?.custom_texts_count || 0) + 1
    } else if (action === 'exercise' && metadata?.exerciseId) {
      const exercisesUsed = (usage?.exercises_used as string[]) || []
      if (!exercisesUsed.includes(metadata.exerciseId as string)) {
        updateData.exercises_used = [...exercisesUsed, metadata.exerciseId as string]
      }
    }

    if (usage) {
      // Update existing record
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (adminClient as any)
        .from('user_monthly_usage')
        .update(updateData)
        .eq('id', usage.id)

      if (error) {
        console.error('Error updating usage:', error)
        return false
      }
    } else {
      // Create new record
      const insertData: UserMonthlyUsageInsert = {
        user_id: userId,
        month: currentMonth,
        submission_count: action === 'submission' ? 1 : 0,
        custom_texts_count: action === 'custom_text' ? 1 : 0,
        exercises_used: action === 'exercise' && metadata?.exerciseId ? [metadata.exerciseId as string] : [],
        ...updateData
      }
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (adminClient as any)
        .from('user_monthly_usage')
        .insert(insertData)

      if (error) {
        console.error('Error creating usage record:', error)
        return false
      }
    }

    return true
  } catch (error) {
    console.error('Error tracking usage:', error)
    return false
  }
}

/**
 * Get user's subscription tier from profile
 */
export async function getUserTier(userId: string): Promise<string> {
  const supabase = createTypedClient()

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Error fetching user tier:', error)
      return 'free' // Default to free on error
    }

    return data?.subscription_tier || 'free'
  } catch (error) {
    console.error('Error in getUserTier:', error)
    return 'free'
  }
}

/**
 * Check if user can access a feature based on tier
 */
export async function canUserAccessFeature(
  userId: string,
  feature: 'leaderboard_view' | 'leaderboard_join' | 'book_stats' | 'data_export'
): Promise<boolean> {
  try {
    const tier = await getUserTier(userId)
    const result = await checkUserLimits(userId, tier, feature)
    return result.allowed
  } catch (error) {
    console.error('Error checking feature access:', error)
    return false
  }
}

/**
 * Get usage summary for a user
 */
export async function getUserUsageSummary(userId: string): Promise<{
  tier: string
  limits: SubscriptionLimits | null
  usage: MonthlyUsage | null
  canSubmit: boolean
  canCreateCustomText: boolean
  remainingSubmissions?: number
  remainingCustomTexts?: number
}> {
  try {
    const tier = await getUserTier(userId)
    const limits = await getSubscriptionLimits(tier)
    const usage = await getUserMonthlyUsage(userId)

    const submissionCheck = await checkUserLimits(userId, tier, 'submission')
    const customTextCheck = await checkUserLimits(userId, tier, 'custom_text')

    return {
      tier,
      limits,
      usage,
      canSubmit: submissionCheck.allowed,
      canCreateCustomText: customTextCheck.allowed,
      remainingSubmissions: limits?.max_submissions_per_month 
        ? Math.max(0, limits.max_submissions_per_month - (usage?.submission_count || 0))
        : undefined,
      remainingCustomTexts: limits?.max_custom_texts
        ? Math.max(0, limits.max_custom_texts - (usage?.custom_texts_count || 0))
        : undefined
    }
  } catch (error) {
    console.error('Error getting usage summary:', error)
    return {
      tier: 'free',
      limits: null,
      usage: null,
      canSubmit: false,
      canCreateCustomText: false
    }
  }
}