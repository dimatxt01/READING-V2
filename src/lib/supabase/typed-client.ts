import { createClient } from './client'
import { createAdminClient } from './admin-client'
import type { Database } from '../types/database'

// Re-export properly typed clients
export function createTypedClient() {
  return createClient()
}

export function createTypedAdminClient() {
  return createAdminClient()
}

// Type helpers for better query typing
export type SupabaseClient = ReturnType<typeof createClient>
export type SupabaseAdminClient = ReturnType<typeof createAdminClient>

// Database table types
export type Tables = Database['public']['Tables']

// Row types for easier access
export type AdminActivityLogRow = Tables['admin_activity_log']['Row']
export type AssessmentQuestionsRow = Tables['assessment_questions']['Row']
export type AssessmentResultsRow = Tables['assessment_results']['Row']
export type AssessmentTextsRow = Tables['assessment_texts']['Row']
export type BookExerciseTextsRow = Tables['book_exercise_texts']['Row']
export type BookReviewsRow = Tables['book_reviews']['Row']
export type BooksRow = Tables['books']['Row']
export type ExerciseResultsRow = Tables['exercise_results']['Row']
export type ExerciseTextsRow = Tables['exercise_texts']['Row']
export type ExercisesRow = Tables['exercises']['Row']
export type PlatformSettingsRow = Tables['platform_settings']['Row']
export type ProfilesRow = Tables['profiles']['Row']
export type ReadingSubmissionsRow = Tables['reading_submissions']['Row']
export type SubscriptionLimitsRow = Tables['subscription_limits']['Row']
export type SubscriptionPlansRow = Tables['subscription_plans']['Row']
export type UserActivityLogRow = Tables['user_activity_log']['Row']
export type UserCustomTextsRow = Tables['user_custom_texts']['Row']
export type UserExerciseStatsRow = Tables['user_exercise_stats']['Row']
export type UserMonthlyUsageRow = Tables['user_monthly_usage']['Row']
export type UserSubscriptionsRow = Tables['user_subscriptions']['Row']

// Insert types for easier access
export type AdminActivityLogInsert = Tables['admin_activity_log']['Insert']
export type AssessmentQuestionsInsert = Tables['assessment_questions']['Insert']
export type AssessmentResultsInsert = Tables['assessment_results']['Insert']
export type AssessmentTextsInsert = Tables['assessment_texts']['Insert']
export type BookExerciseTextsInsert = Tables['book_exercise_texts']['Insert']
export type BookReviewsInsert = Tables['book_reviews']['Insert']
export type BooksInsert = Tables['books']['Insert']
export type ExerciseResultsInsert = Tables['exercise_results']['Insert']
export type ExerciseTextsInsert = Tables['exercise_texts']['Insert']
export type ExercisesInsert = Tables['exercises']['Insert']
export type PlatformSettingsInsert = Tables['platform_settings']['Insert']
export type ProfilesInsert = Tables['profiles']['Insert']
export type ReadingSubmissionsInsert = Tables['reading_submissions']['Insert']
export type SubscriptionLimitsInsert = Tables['subscription_limits']['Insert']
export type SubscriptionPlansInsert = Tables['subscription_plans']['Insert']
export type UserActivityLogInsert = Tables['user_activity_log']['Insert']
export type UserCustomTextsInsert = Tables['user_custom_texts']['Insert']
export type UserExerciseStatsInsert = Tables['user_exercise_stats']['Insert']
export type UserMonthlyUsageInsert = Tables['user_monthly_usage']['Insert']
export type UserSubscriptionsInsert = Tables['user_subscriptions']['Insert']

// Update types for easier access
export type AdminActivityLogUpdate = Tables['admin_activity_log']['Update']
export type AssessmentQuestionsUpdate = Tables['assessment_questions']['Update']
export type AssessmentResultsUpdate = Tables['assessment_results']['Update']
export type AssessmentTextsUpdate = Tables['assessment_texts']['Update']
export type BookExerciseTextsUpdate = Tables['book_exercise_texts']['Update']
export type BookReviewsUpdate = Tables['book_reviews']['Update']
export type BooksUpdate = Tables['books']['Update']
export type ExerciseResultsUpdate = Tables['exercise_results']['Update']
export type ExerciseTextsUpdate = Tables['exercise_texts']['Update']
export type ExercisesUpdate = Tables['exercises']['Update']
export type PlatformSettingsUpdate = Tables['platform_settings']['Update']
export type ProfilesUpdate = Tables['profiles']['Update']
export type ReadingSubmissionsUpdate = Tables['reading_submissions']['Update']
export type SubscriptionLimitsUpdate = Tables['subscription_limits']['Update']
export type SubscriptionPlansUpdate = Tables['subscription_plans']['Update']
export type UserActivityLogUpdate = Tables['user_activity_log']['Update']
export type UserCustomTextsUpdate = Tables['user_custom_texts']['Update']
export type UserExerciseStatsUpdate = Tables['user_exercise_stats']['Update']
export type UserMonthlyUsageUpdate = Tables['user_monthly_usage']['Update']
export type UserSubscriptionsUpdate = Tables['user_subscriptions']['Update']