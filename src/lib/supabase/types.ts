import type { Database } from '@/lib/types/database'
import type {
  FeatureFlag,
  SubscriptionLimits,
  UserSubscription,
  UserMonthlyUsage,
  Exercise,
  ExerciseText,
  ExerciseResult,
  AssessmentText,
  AssessmentQuestion,
  AdminActivityLog
} from '@/lib/types/database-extensions'

// Extended database type that includes admin tables
export interface ExtendedDatabase extends Database {
  public: Database['public'] & {
    Tables: Database['public']['Tables'] & {
      feature_flags: {
        Row: FeatureFlag
        Insert: Partial<FeatureFlag>
        Update: Partial<FeatureFlag>
      }
      subscription_limits: {
        Row: SubscriptionLimits
        Insert: Partial<SubscriptionLimits>
        Update: Partial<SubscriptionLimits>
      }
      user_subscriptions: {
        Row: UserSubscription
        Insert: Partial<UserSubscription>
        Update: Partial<UserSubscription>
      }
      user_monthly_usage: {
        Row: UserMonthlyUsage
        Insert: Partial<UserMonthlyUsage>
        Update: Partial<UserMonthlyUsage>
      }
      exercises: {
        Row: Exercise
        Insert: Partial<Exercise>
        Update: Partial<Exercise>
      }
      exercise_texts: {
        Row: ExerciseText
        Insert: Partial<ExerciseText>
        Update: Partial<ExerciseText>
      }
      exercise_results: {
        Row: ExerciseResult
        Insert: Partial<ExerciseResult>
        Update: Partial<ExerciseResult>
      }
      assessment_texts: {
        Row: AssessmentText
        Insert: Partial<AssessmentText>
        Update: Partial<AssessmentText>
      }
      assessment_questions: {
        Row: AssessmentQuestion
        Insert: Partial<AssessmentQuestion>
        Update: Partial<AssessmentQuestion>
      }
      admin_activity_log: {
        Row: AdminActivityLog
        Insert: Partial<AdminActivityLog>
        Update: Partial<AdminActivityLog>
      }
    }
  }
}

// Type helper for table names
export type AdminTableName = 
  | 'feature_flags'
  | 'subscription_limits'
  | 'user_subscriptions'
  | 'user_monthly_usage'
  | 'exercises'
  | 'exercise_texts'
  | 'exercise_results'
  | 'assessment_texts'
  | 'assessment_questions'
  | 'admin_activity_log'