import { Json } from './database'

// Exercise Types
export type ExerciseType = 'word_flasher' | '3-2-1' | 'mindset' | 'assessment' | 'custom'

export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced'

export type SubscriptionTier = 'free' | 'reader' | 'pro'

// Database Types for Exercises
export interface Exercise {
  id: string
  type: ExerciseType
  title: string
  description: string | null
  instructions: string | null
  difficulty: DifficultyLevel | null
  requires_subscription: boolean
  min_subscription_tier: SubscriptionTier
  is_active: boolean
  tags: string[] | null
  config: Json
  created_at: string
  updated_at: string
}

export interface ExerciseText {
  id: string
  exercise_id: string | null
  book_id: string | null
  title: string | null
  text_content: string
  word_count: number | null
  difficulty_level: string | null
  is_custom: boolean
  created_by: string | null
  created_at: string
}

export interface ExerciseResult {
  id: string
  user_id: string
  exercise_id: string
  session_date: string
  accuracy_percentage: number | null // 0-100
  avg_response_time: number | null
  total_attempts: number
  correct_count: number
  wpm: number | null
  completion_time: number | null
  metadata: Json
  created_at: string
  
  // Optional joined data
  exercise?: Exercise
}

export interface AssessmentResult {
  id: string
  user_id: string
  text_id: string
  exercise_result_id: string | null
  words_per_minute: number
  comprehension_score: number // percentage 0-100
  time_spent_reading: number // seconds
  questions_correct: number
  total_questions: number
  answers_data: Json
  percentile_rank: number | null // percentage 0-100
  completed_at: string
  created_at: string
}

export interface UserExerciseStats {
  id: string
  user_id: string
  exercise_type: string
  total_sessions: number
  total_time_spent: number // seconds
  best_score: number
  best_accuracy: number
  best_wpm: number
  average_score: number
  average_accuracy: number
  average_wpm: number
  current_difficulty: DifficultyLevel
  current_level: number
  consecutive_sessions: number
  last_session_at: string | null
  adaptive_speed: number // for word flasher (ms per word)
  adaptive_multiplier: number // for speed exercises
  created_at: string
  updated_at: string
}

// Exercise Configuration Types
export interface WordFlasherConfig {
  default_speed: number
  min_speed: number
  max_speed: number
  words_per_round: number
  accuracy_threshold: number
  speed_adjustment: number
  vocabulary_levels: {
    foundation: string
    intermediate: string
    advanced: string
  }
}

export interface ThreeTwoOneConfig {
  rounds: Array<{
    name: string
    duration: number
    multiplier: number
  }>
  allow_custom_text: boolean
  min_text_length: number
  max_text_length: number
}

export interface MindsetConfig {
  content: string
}

// Frontend Exercise Types
export interface ExerciseSession {
  exercise: Exercise
  text?: ExerciseText
  settings: ExerciseSessionSettings
  startTime?: Date
  endTime?: Date
  results?: ExerciseSessionResult
}

export interface ExerciseSessionSettings {
  // Word Flasher
  flashSpeed?: number // milliseconds per word
  vocabularyLevel?: 'foundation' | 'intermediate' | 'advanced'
  wordsPerRound?: number
  
  // 3-2-1 Exercise
  useCustomText?: boolean
  customText?: string
  
  // Common
  difficulty?: DifficultyLevel
}

export interface ExerciseSessionResult {
  score: number // 0-100
  accuracy: number // 0-100
  wordsPerMinute?: number
  timeSpent: number // seconds
  totalAttempts: number
  correctCount: number
  details: ExerciseResultDetails
}

export interface ExerciseResultDetails {
  // Word Flasher specific
  wordsShown?: string[]
  userAnswers?: string[]
  responseTimes?: number[]
  
  // 3-2-1 specific
  roundResults?: Array<{
    roundName: string
    duration: number
    wordsRead: number
    readingSpeed: number
  }>
  
  // Assessment specific
  questionAnswers?: Array<{
    question: string
    userAnswer: string | number | boolean
    correctAnswer: string | number | boolean
    isCorrect: boolean
  }>
  
  // Mindset exercise specific
  sectionsCompleted?: number
  totalSections?: number
  timeSpent?: number
}

// Assessment Types
export interface AssessmentQuestion {
  question: string
  type: 'multiple_choice' | 'true_false' | 'short_answer'
  options?: string[] // for multiple choice
  correct_answer: string | number | boolean
}

export interface AssessmentMetadata {
  questions: AssessmentQuestion[]
}

// Exercise Progress Types
export interface ExerciseProgress {
  exerciseId: string
  exerciseType: ExerciseType
  level: number
  difficulty: DifficultyLevel
  sessionsCompleted: number
  bestScore: number
  averageScore: number
  streakDays: number
  totalTimeSpent: number
  lastCompletedAt: string | null
  nextRecommendedSettings: ExerciseSessionSettings
}

// Word Lists for Word Flasher
export interface VocabularyWordList {
  level: 'foundation' | 'intermediate' | 'advanced'
  words: string[]
}

// API Types
export interface CreateExerciseResultRequest {
  exerciseId: string
  textId?: string
  results: ExerciseSessionResult
  settings: ExerciseSessionSettings
}

export interface ExerciseStatsResponse {
  exercise: Exercise
  userStats: UserExerciseStats | null
  progress: ExerciseProgress
  recentResults: ExerciseResult[]
}

export interface ExerciseLeaderboard {
  exerciseType: ExerciseType
  period: 'daily' | 'weekly' | 'monthly' | 'all_time'
  entries: Array<{
    userId: string
    userName: string
    avatar?: string
    score: number
    rank: number
    sessions: number
  }>
}

// Exercise Form Types
export interface ExerciseFormData {
  type: ExerciseType
  title: string
  description: string
  instructions: string
  difficulty_level: DifficultyLevel
  estimated_duration: number
  subscription_tier_required: SubscriptionTier
  is_active: boolean
  tags: string[]
  config: WordFlasherConfig | ThreeTwoOneConfig | MindsetConfig | Json
}

export interface ExerciseTextFormData {
  title: string
  content: string
  difficulty_level: DifficultyLevel
  type: 'assessment' | 'practice' | 'custom'
  is_public: boolean
  exercise_type?: ExerciseType
  metadata?: Json
}

// Error Types
export interface ExerciseError {
  code: string
  message: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  details?: any
}

// Utility Types
export type ExerciseWithStats = Exercise & {
  user_stats: UserExerciseStats | null
  progress: ExerciseProgress
}

export type ExerciseTextWithWordCount = ExerciseText & {
  word_count: number
}

export type ExerciseResultWithText = ExerciseResult & {
  exercise: Exercise
  exercise_text: ExerciseText | null
}

// Hook Types
export interface UseExerciseResult {
  exercises: Exercise[]
  loading: boolean
  error: ExerciseError | null
  refetch: () => Promise<void>
}

export interface UseExerciseSessionResult {
  session: ExerciseSession | null
  startSession: (exercise: Exercise, settings?: ExerciseSessionSettings) => void
  completeSession: (results: ExerciseSessionResult) => Promise<void>
  resetSession: () => void
  loading: boolean
  error: ExerciseError | null
}