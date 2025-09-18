import { Database } from './database'

// Base types from database
export type AssessmentText = Database['public']['Tables']['assessment_texts']['Row']
export type AssessmentResult = Database['public']['Tables']['assessment_results']['Row']
export type AssessmentQuestion = Database['public']['Tables']['assessment_questions']['Row']
export type UserAssessmentStats = Database['public']['Tables']['user_assessment_stats']['Row']
export type SubscriptionTierLimits = Database['public']['Tables']['subscription_tier_limits']['Row']
export type UserAssessmentUsage = Database['public']['Tables']['user_assessment_usage']['Row']
export type AssessmentAttemptLog = Database['public']['Tables']['assessment_attempt_logs']['Row']

// Insert types
export type AssessmentTextInsert = Database['public']['Tables']['assessment_texts']['Insert']
export type AssessmentResultInsert = Database['public']['Tables']['assessment_results']['Insert']
export type UserAssessmentStatsInsert = Database['public']['Tables']['user_assessment_stats']['Insert']
export type SubscriptionTierLimitsInsert = Database['public']['Tables']['subscription_tier_limits']['Insert']
export type UserAssessmentUsageInsert = Database['public']['Tables']['user_assessment_usage']['Insert']
export type AssessmentAttemptLogInsert = Database['public']['Tables']['assessment_attempt_logs']['Insert']

// Update types
export type AssessmentTextUpdate = Database['public']['Tables']['assessment_texts']['Update']
export type AssessmentResultUpdate = Database['public']['Tables']['assessment_results']['Update']
export type UserAssessmentStatsUpdate = Database['public']['Tables']['user_assessment_stats']['Update']
export type SubscriptionTierLimitsUpdate = Database['public']['Tables']['subscription_tier_limits']['Update']
export type UserAssessmentUsageUpdate = Database['public']['Tables']['user_assessment_usage']['Update']
export type AssessmentAttemptLogUpdate = Database['public']['Tables']['assessment_attempt_logs']['Update']

// Question format from JSON
export interface AssessmentQuestionFormat {
  id: string
  question: string
  order: number
}

// Assessment with extended info
export interface AssessmentWithStats extends AssessmentText {
  completionStatus?: 'not_started' | 'in_progress' | 'completed'
  lastResult?: AssessmentResult
  attemptCount?: number
  bestWpm?: number
  bestComprehension?: number
}

// Result with assessment info
export interface AssessmentResultWithText extends AssessmentResult {
  assessment: AssessmentText
}

// User stats with formatted data
export interface FormattedUserStats {
  totalAssessmentsTaken: number
  averageWpm: number
  averageComprehension: number
  lastAssessment?: {
    id: string
    title: string
    date: string
    wpm: number
    comprehension: number
  }
}

// Assessment limit check result
export interface AssessmentLimitCheck {
  canTake: boolean
  reason?: string
  monthlyRemaining: number
  dailyRemaining: number
  tier: string
  monthlyLimit?: number
  dailyLimit?: number
  monthlyUsed?: number
  dailyUsed?: number
}

// Assessment submission data
export interface AssessmentSubmission {
  assessmentId: string
  userId: string
  answers: Record<string, string>
  timeSpent: number
  wpm: number
}

// Assessment completion response
export interface AssessmentCompletionResponse {
  id: string
  wpm: number
  comprehensionPercentage: number
  percentile: number
  comparisonPercentile: number
  attemptNumber: number
  message: string
}

// Subscription tier configuration
export interface TierConfig {
  name: string
  monthlyLimit: number
  dailyLimit: number | null
  features: {
    unlimitedAssessments?: boolean
    advancedStats?: boolean
    exportResults?: boolean
    [key: string]: boolean | undefined
  }
}

// Assessment stage for UI
export type AssessmentStage = 'intro' | 'reading' | 'questions' | 'results'

// Assessment session state
export interface AssessmentSession {
  assessmentId: string
  sessionId: string
  startTime: number
  readingStartTime?: number
  readingEndTime?: number
  currentQuestionIndex: number
  answers: Record<string, string>
  stage: AssessmentStage
}

// Mock external API response for comprehension scoring
export interface ComprehensionScoringResponse {
  score: number // 0-100 percentage
  feedback?: string
  questionScores?: Record<string, number>
}