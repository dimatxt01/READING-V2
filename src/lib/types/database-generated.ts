// Generated TypeScript types from database schema

export interface AdminActivityLog {
  id: string;
  admin_id: string | null;
  action: string | null;
  entity_type: string | null;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string | null;
}

export interface AssessmentQuestions {
  id: string;
  assessment_text_id: string | null;
  question: string;
  options: string[] | null;
  correct_answer: string | null;
  order_index: number | null;
  created_at: string | null;
}

export interface AssessmentResults {
  id: string;
  user_id: string;
  assessment_id: string;
  wpm: number;
  comprehension_percentage: number | null;
  time_taken: number;
  answers: Record<string, unknown> | null;
  percentile: number | null;
  created_at: string | null;
}

export interface AssessmentTexts {
  id: string;
  title: string;
  content: string;
  word_count: number;
  questions: Record<string, unknown>;
  difficulty_level: string | null;
  category: string | null;
  active: boolean | null;
  times_used: number | null;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface BookExerciseTexts {
  id: string;
  book_id: string | null;
  exercise_id: string;
  text_content: string;
  word_count: number | null;
  page_start: number | null;
  page_end: number | null;
  difficulty_level: string | null;
  created_by: string;
  created_at: string | null;
}

export interface BookReviews {
  id: string;
  book_id: string;
  user_id: string;
  rating: number | null;
  review_text: string | null;
  is_edited: boolean | null;
  edited_at: string | null;
  deleted_at: string | null;
  can_recreate_after: string | null;
  helpful_count: number | null;
  created_at: string | null;
}

export interface Books {
  id: string;
  title: string;
  author: string;
  isbn: string | null;
  cover_url: string | null;
  total_pages: number | null;
  genre: string | null;
  publication_year: number | null;
  status: string | null;
  merged_with_id: string | null;
  created_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface ExerciseResults {
  id: string;
  user_id: string;
  exercise_id: string;
  session_date: string;
  accuracy_percentage: number | null;
  avg_response_time: number | null;
  total_attempts: number | null;
  correct_count: number | null;
  wpm: number | null;
  completion_time: number | null;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
}

export interface ExerciseTexts {
  id: string;
  exercise_id: string | null;
  book_id: string | null;
  title: string | null;
  text_content: string;
  word_count: number | null;
  difficulty_level: string | null;
  is_custom: boolean | null;
  created_by: string | null;
  created_at: string | null;
}

export interface Exercises {
  id: string;
  title: string;
  type: string;
  difficulty: string | null;
  tags: string[] | null;
  description: string | null;
  instructions: string | null;
  requires_subscription: boolean | null;
  min_subscription_tier: string | null;
  config: Record<string, unknown> | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface FeatureFlags {
  id: string;
  name: string;
  description: string | null;
  enabled: boolean | null;
  requires_subscription: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface PlatformSettings {
  id: string;
  key: string;
  value: Record<string, unknown>;
  description: string | null;
  category: string | null;
  updated_by: string | null;
  updated_at: string | null;
}

export interface Profiles {
  id: string;
  full_name: string | null;
  city: string | null;
  avatar_url: string | null;
  role: string | null;
  subscription_tier: string | null;
  subscription_status: string | null;
  privacy_settings: Record<string, unknown> | null;
  total_pages_read: number | null;
  total_books_completed: number | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface ReadingSubmissions {
  id: string;
  user_id: string;
  book_id: string;
  pages_read: number;
  time_spent: number;
  submission_date: string;
  session_timestamp: string;
  was_premium: boolean | null;
  notes: string | null;
  created_at: string | null;
}

export interface SubscriptionLimits {
  id: string;
  tier: string;
  max_submissions_per_month: number | null;
  max_custom_texts: number | null;
  max_exercises: number | null;
  can_see_leaderboard: boolean | null;
  can_join_leaderboard: boolean | null;
  can_see_book_stats: boolean | null;
  can_export_data: boolean | null;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface SubscriptionPlans {
  id: string;
  name: string;
  display_name: string;
  price_monthly: number | null;
  price_yearly: number | null;
  stripe_price_id_monthly: string | null;
  stripe_price_id_yearly: string | null;
  features: Record<string, unknown>;
  limits: Record<string, unknown>;
  sort_order: number;
  active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface UserActivityLog {
  id: string;
  user_id: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
}

export interface UserCustomTexts {
  id: string;
  user_id: string;
  title: string;
  content: string;
  word_count: number | null;
  exercise_id: string | null;
  last_used_at: string | null;
  times_used: number | null;
  created_at: string | null;
}

export interface UserExerciseStats {
  id: string;
  user_id: string;
  exercise_type: string;
  total_sessions: number | null;
  total_time_spent: number | null;
  best_score: number | null;
  best_accuracy: number | null;
  best_wpm: number | null;
  average_score: number | null;
  average_accuracy: number | null;
  average_wpm: number | null;
  current_difficulty: string | null;
  current_level: number | null;
  consecutive_sessions: number | null;
  last_session_at: string | null;
  adaptive_speed: number | null;
  adaptive_multiplier: number | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface UserMonthlyUsage {
  id: string;
  user_id: string | null;
  month: string;
  submission_count: number | null;
  custom_texts_count: number | null;
  exercises_used: string[] | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface UserSubscriptions {
  id: string;
  user_id: string;
  plan_id: string;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  status: string;
  billing_cycle: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
  canceled_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

