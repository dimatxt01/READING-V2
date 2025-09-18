import { SupabaseClient } from '@supabase/supabase-js'

// Database query optimization utilities
export class DatabaseOptimizer {
  private supabase: SupabaseClient

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase
  }

  // Optimized book search with proper indexing
  async searchBooks(
    query: string,
    options: {
      limit?: number
      offset?: number
      status?: 'approved' | 'pending' | 'rejected'
      includeStats?: boolean
    } = {}
  ) {
    const { limit = 10, offset = 0, status = 'approved', includeStats = false } = options

    let queryBuilder = this.supabase
      .from('books')
      .select(
        includeStats
          ? `
            id, title, author, cover_url, total_pages, genre,
            book_stats:reading_submissions(count),
            avg_rating:book_reviews(rating.avg())
          `
          : 'id, title, author, cover_url, total_pages, genre'
      )
      .eq('status', status)
      .range(offset, offset + limit - 1)

    if (query) {
      // Use full-text search for better performance
      queryBuilder = queryBuilder.or(
        `title.ilike.%${query}%,author.ilike.%${query}%`
      )
    }

    return queryBuilder.order('created_at', { ascending: false })
  }

  // Optimized user submissions with pagination
  async getUserSubmissions(
    userId: string,
    options: {
      limit?: number
      offset?: number
      startDate?: string
      endDate?: string
      bookId?: string
    } = {}
  ) {
    const { limit = 20, offset = 0, startDate, endDate, bookId } = options

    let query = this.supabase
      .from('reading_submissions')
      .select(`
        id, pages_read, time_spent, submission_date, notes, created_at,
        books(id, title, author, cover_url)
      `)
      .eq('user_id', userId)
      .range(offset, offset + limit - 1)
      .order('submission_date', { ascending: false })

    if (startDate) {
      query = query.gte('submission_date', startDate)
    }
    if (endDate) {
      query = query.lte('submission_date', endDate)
    }
    if (bookId) {
      query = query.eq('book_id', bookId)
    }

    return query
  }

  // Optimized leaderboard with materialized view
  async getLeaderboard(
    timeRange: 'daily' | 'weekly' | 'monthly',
    options: {
      limit?: number
      userId?: string
    } = {}
  ) {
    const { limit = 10, userId } = options

    // Use materialized view for better performance
    const { data: leaderboardData, error } = await this.supabase
      .rpc('get_leaderboard_with_privacy', {
        time_range: timeRange,
        result_limit: limit
      })

    if (error) throw error

    // If user ID provided, get their rank
    let userRank = null
    if (userId) {
      const { data: rankData } = await this.supabase
        .rpc('get_user_leaderboard_rank', {
          user_id: userId,
          time_range: timeRange
        })
      userRank = rankData
    }

    return { leaderboard: leaderboardData, userRank }
  }

  // Batch operations for better performance
  async batchInsertSubmissions(submissions: Record<string, unknown>[]) {
    // Insert in batches of 100
    const batchSize = 100
    const results = []

    for (let i = 0; i < submissions.length; i += batchSize) {
      const batch = submissions.slice(i, i + batchSize)
      const { data, error } = await this.supabase
        .from('reading_submissions')
        .insert(batch)
        .select()

      if (error) throw error
      results.push(...(data || []))
    }

    return results
  }

  // Optimized user statistics aggregation
  async getUserStats(userId: string) {
    // Use a single query with aggregations
    const { data, error } = await this.supabase
      .rpc('get_user_reading_stats', { user_id: userId })

    if (error) throw error
    return data
  }

  // Connection pooling and query monitoring
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        if (attempt === maxRetries) {
          throw error
        }
        
        console.warn(`Query attempt ${attempt} failed, retrying in ${delay}ms...`)
        await new Promise(resolve => setTimeout(resolve, delay * attempt))
      }
    }
    
    throw new Error('Max retries exceeded')
  }
}

// Query performance monitoring
export class QueryMonitor {
  private static queries: Map<string, {
    count: number
    totalTime: number
    avgTime: number
    errors: number
  }> = new Map()

  static startMonitoring(queryName: string): () => void {
    const startTime = performance.now()
    
    return () => {
      const endTime = performance.now()
      const duration = endTime - startTime
      
      this.recordQuery(queryName, duration)
    }
  }

  private static recordQuery(name: string, duration: number, isError: boolean = false) {
    const existing = this.queries.get(name) || {
      count: 0,
      totalTime: 0,
      avgTime: 0,
      errors: 0
    }

    existing.count++
    existing.totalTime += duration
    existing.avgTime = existing.totalTime / existing.count
    
    if (isError) {
      existing.errors++
    }

    this.queries.set(name, existing)

    // Log slow queries
    if (duration > 1000) { // Longer than 1 second
      console.warn(`Slow query detected: ${name} took ${duration.toFixed(2)}ms`)
    }
  }

  static getStats() {
    return Object.fromEntries(this.queries.entries())
  }

  static reset() {
    this.queries.clear()
  }
}

// Database indexes for optimal performance
export const RECOMMENDED_INDEXES = `
-- Reading submissions indexes
CREATE INDEX IF NOT EXISTS idx_reading_submissions_user_date 
ON reading_submissions(user_id, submission_date DESC);

CREATE INDEX IF NOT EXISTS idx_reading_submissions_book_date 
ON reading_submissions(book_id, submission_date DESC);

CREATE INDEX IF NOT EXISTS idx_reading_submissions_created_at 
ON reading_submissions(created_at DESC);

-- Books search index
CREATE INDEX IF NOT EXISTS idx_books_search 
ON books USING gin((title || ' ' || author) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_books_status_created 
ON books(status, created_at DESC);

-- Exercise results index
CREATE INDEX IF NOT EXISTS idx_exercise_results_user_date 
ON exercise_results(user_id, session_date DESC);

-- Profiles index
CREATE INDEX IF NOT EXISTS idx_profiles_subscription 
ON profiles(subscription_tier, subscription_status);

-- Leaderboard materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS leaderboard_cache AS
SELECT 
  rs.user_id,
  p.full_name,
  p.avatar_url,
  p.privacy_settings,
  p.subscription_tier,
  DATE(rs.submission_date) as submission_date,
  SUM(rs.pages_read) as total_pages,
  SUM(rs.time_spent) as total_time,
  COUNT(*) as session_count,
  ROUND(AVG(rs.pages_read::numeric / rs.time_spent * 60), 2) as avg_speed
FROM reading_submissions rs
JOIN profiles p ON rs.user_id = p.id
WHERE rs.submission_date >= CURRENT_DATE - INTERVAL '1 month'
GROUP BY rs.user_id, p.full_name, p.avatar_url, p.privacy_settings, 
         p.subscription_tier, DATE(rs.submission_date);

CREATE UNIQUE INDEX IF NOT EXISTS idx_leaderboard_cache_unique 
ON leaderboard_cache(user_id, submission_date);

-- Refresh function for materialized view
CREATE OR REPLACE FUNCTION refresh_leaderboard_cache()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard_cache;
END;
$$ LANGUAGE plpgsql;
`

// Performance testing utilities
export class PerformanceTester {
  static async benchmarkQuery(
    queryName: string,
    queryFunction: () => Promise<unknown>,
    iterations: number = 10
  ) {
    const times: number[] = []
    
    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now()
      await queryFunction()
      const endTime = performance.now()
      times.push(endTime - startTime)
    }

    const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length
    const minTime = Math.min(...times)
    const maxTime = Math.max(...times)

    console.log(`Performance benchmark for ${queryName}:`)
    console.log(`  Average: ${avgTime.toFixed(2)}ms`)
    console.log(`  Min: ${minTime.toFixed(2)}ms`)
    console.log(`  Max: ${maxTime.toFixed(2)}ms`)
    console.log(`  Iterations: ${iterations}`)

    return { avgTime, minTime, maxTime, times }
  }
}