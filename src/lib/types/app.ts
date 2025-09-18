import { Database } from './database'

// App-specific types based on database schema
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Book = Database['public']['Tables']['books']['Row']
export type ReadingSubmission = Database['public']['Tables']['reading_submissions']['Row']
export type BookReview = Database['public']['Tables']['book_reviews']['Row']

// Insert types for creating new records
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
export type BookInsert = Database['public']['Tables']['books']['Insert']
export type ReadingSubmissionInsert = Database['public']['Tables']['reading_submissions']['Insert']
export type BookReviewInsert = Database['public']['Tables']['book_reviews']['Insert']

// Update types for updating records
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']
export type BookUpdate = Database['public']['Tables']['books']['Update']
export type ReadingSubmissionUpdate = Database['public']['Tables']['reading_submissions']['Update']
export type BookReviewUpdate = Database['public']['Tables']['book_reviews']['Update']

// Custom app types
export interface UserStats {
  totalPages: number
  totalTime: number
  booksCompleted: number
  averageSpeed: number
  readingStreak: number
}

export interface BookWithStats extends Book {
  readerCount: number
  avgRating: number
  reviewCount: number
  avgReadingSpeed: number
}

export interface SubmissionWithBook extends ReadingSubmission {
  book: Book
}

export interface ReviewWithUser extends BookReview {
  user: Pick<Profile, 'id' | 'full_name' | 'avatar_url'>
}

// API Response types
export interface APIResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: unknown
  }
  meta?: {
    page?: number
    limit?: number
    total?: number
  }
}

// Form types
export interface SubmissionForm {
  bookId: string
  pagesRead: number
  timeSpent: number
  submissionDate: string
  notes?: string
}

export interface BulkSubmissionForm {
  totalPages: number
  totalMinutes: number
  startDate: string
  endDate: string
  bookId: string
}

export interface BookCreationForm {
  title: string
  author: string
  isbn?: string
  totalPages?: number
  genre?: string
  publicationYear?: number
}

export interface ProfileUpdateForm {
  fullName?: string
  city?: string
  privacySettings?: PrivacySettings
}

// Privacy settings types
export interface PrivacySettings {
  profile: {
    showFullName: boolean
    showCity: boolean
    showAvatar: boolean
  }
  stats: {
    showPagesRead: boolean
    showBooksCompleted: boolean
    showReadingSpeed: boolean
    showExercisePerformance: boolean
  }
  activity: {
    showCurrentBooks: boolean
    showReadingHistory: boolean
    showSubmissionTimes: boolean
  }
  leaderboard: {
    showOnLeaderboard: boolean
    useRealName: boolean
  }
}

// Chart data types
export interface ChartDataPoint {
  date: string
  value: number
  label?: string
}

export interface ProgressChartData {
  data: ChartDataPoint[]
  period: 'week' | 'month' | 'year' | 'all'
}

// Subscription types (for future phases)
export type SubscriptionTier = 'free' | 'reader' | 'pro'
export type SubscriptionStatus = 'active' | 'inactive' | 'canceled' | 'past_due'