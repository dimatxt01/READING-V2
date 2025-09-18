/**
 * Extended database types for tables not in the generated Supabase types
 * These types represent additional tables created for admin functionality
 */

export interface FeatureFlag {
  id: string
  name: string
  description: string | null
  enabled: boolean
  requires_subscription: 'free' | 'reader' | 'pro'
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface SubscriptionLimits {
  id: string
  tier: 'free' | 'reader' | 'pro'
  max_submissions_per_month: number | null
  max_custom_texts: number | null
  max_exercises: number | null
  can_see_leaderboard: boolean
  can_join_leaderboard: boolean
  can_see_book_stats: boolean
  can_export_data: boolean
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface UserSubscription {
  id: string
  user_id: string
  tier: 'free' | 'reader' | 'pro'
  status: 'active' | 'inactive' | 'canceled' | 'past_due'
  is_manual_override: boolean
  manual_override_reason: string | null
  expires_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface UserMonthlyUsage {
  id: string
  user_id: string
  month: string // Date in YYYY-MM-01 format
  submission_count: number
  custom_texts_count: number
  exercises_used: string[]
  created_at: string
  updated_at: string
}

export interface Exercise {
  id: string
  title: string
  type: string
  difficulty: string | null
  tags: string[] | null
  description: string | null
  instructions: string | null
  requires_subscription: boolean | null
  min_subscription_tier: string | null
  config: Record<string, unknown> | null
  is_active: boolean | null
  created_at: string | null
  updated_at: string | null
}

export interface ExerciseText {
  id: string
  exercise_id: string
  book_id: string | null
  title: string | null
  text_content: string
  word_count: number | null
  difficulty_level: 'beginner' | 'intermediate' | 'advanced' | null
  is_custom: boolean
  created_by: string | null
  created_at: string
}

export interface ExerciseResult {
  id: string
  user_id: string
  exercise_id: string
  exercise_text_id: string | null
  started_at: string
  completed_at: string | null
  results: Record<string, unknown> | null
  score: number | null
  metadata: Record<string, unknown>
}

export interface AssessmentText {
  id: string
  title: string
  content: string
  word_count: number
  questions: unknown[] // JSONB field
  difficulty_level: string | null
  category: string | null
  active: boolean | null
  times_used: number | null
  created_by: string | null
  created_at: string | null
  updated_at: string | null
}

export interface AssessmentQuestion {
  id: string
  assessment_text_id: string
  question: string
  options: unknown[] | null // Array of answer options
  correct_answer: string | null
  order_index: number | null
  created_at: string
}

export interface AdminActivityLog {
  id: string
  admin_id: string
  action: string
  entity_type: string | null
  entity_id: string | null
  details: Record<string, unknown> | null
  created_at: string
}

// Type guards for runtime validation
export function isFeatureFlag(obj: unknown): obj is FeatureFlag {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'name' in obj &&
    'enabled' in obj &&
    'requires_subscription' in obj
  )
}

export function isSubscriptionLimits(obj: unknown): obj is SubscriptionLimits {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'tier' in obj &&
    'max_submissions_per_month' in obj
  )
}

export function isUserSubscription(obj: unknown): obj is UserSubscription {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'user_id' in obj &&
    'tier' in obj &&
    'status' in obj
  )
}

export function isUserMonthlyUsage(obj: unknown): obj is UserMonthlyUsage {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'user_id' in obj &&
    'month' in obj &&
    'submission_count' in obj
  )
}

export function isExercise(obj: unknown): obj is Exercise {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'name' in obj &&
    'slug' in obj &&
    'is_active' in obj
  )
}

export function isExerciseText(obj: unknown): obj is ExerciseText {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'exercise_id' in obj &&
    'text_content' in obj
  )
}