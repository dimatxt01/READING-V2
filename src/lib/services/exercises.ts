import { createTypedClient } from '@/lib/supabase/typed-client'
import { createClient } from '@/lib/supabase/client'
import type {
  ExercisesRow,
  ExerciseResultsInsert
} from '@/lib/supabase/typed-client'
import { 
  Exercise, 
  ExerciseText, 
  ExerciseResult, 
  UserExerciseStats,
  ExerciseType,
  DifficultyLevel,
  SubscriptionTier,
  CreateExerciseResultRequest,
  ExerciseSessionSettings,
  VocabularyWordList
} from '@/lib/types/exercises'
import type { Json } from '@/lib/types/database'

export class ExerciseService {
  // Get all available exercises for a user based on subscription tier
  static async getAvailableExercises(subscriptionTier: 'free' | 'reader' | 'pro' = 'free'): Promise<Exercise[]> {
    const tierOrder = { free: 0, reader: 1, pro: 2 }
    const userTierLevel = tierOrder[subscriptionTier]
    
    const supabase = createTypedClient()
    const { data, error } = await supabase
      .from('exercises')
      .select('*')
      .eq('is_active', true)
      .order('difficulty')
      .order('title')
    
    if (error) {
      console.error('Error fetching exercises:', error)
      throw new Error('Failed to fetch exercises')
    }
    
    // Filter exercises based on subscription tier and cast types
    return data.filter((exercise: ExercisesRow) => {
      const requiredTierLevel = tierOrder[exercise.min_subscription_tier as keyof typeof tierOrder] || 0
      return userTierLevel >= requiredTierLevel
    }).map((exercise: ExercisesRow): Exercise => ({
      ...exercise,
      type: exercise.type as ExerciseType,
      difficulty: exercise.difficulty as DifficultyLevel | null,
      min_subscription_tier: exercise.min_subscription_tier as SubscriptionTier,
      requires_subscription: exercise.requires_subscription ?? false,
      is_active: exercise.is_active ?? true,
      tags: exercise.tags as string[] | null,
      config: exercise.config as Json,
      created_at: exercise.created_at ?? new Date().toISOString(),
      updated_at: exercise.updated_at ?? new Date().toISOString()
    }))
  }
  
  // Get a specific exercise by ID
  static async getExercise(id: string): Promise<Exercise | null> {
    const supabase = createTypedClient()
    const { data, error } = await supabase
      .from('exercises')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') return null
      throw new Error('Failed to fetch exercise')
    }
    
    if (!data) return null
    
    return {
      ...data,
      type: data.type as ExerciseType,
      difficulty: data.difficulty as DifficultyLevel | null,
      min_subscription_tier: data.min_subscription_tier as SubscriptionTier,
      requires_subscription: data.requires_subscription ?? false,
      is_active: data.is_active ?? true,
      tags: data.tags as string[] | null,
      config: data.config as Json,
      created_at: data.created_at ?? new Date().toISOString(),
      updated_at: data.updated_at ?? new Date().toISOString()
    }
  }
  
  // Get exercises by type
  static async getExercisesByType(type: ExerciseType): Promise<Exercise[]> {
    const supabase = createTypedClient()
    const { data, error } = await supabase
      .from('exercises')
      .select('*')
      .eq('type', type)
      .eq('is_active', true)
      .order('difficulty')
    
    if (error) {
      throw new Error('Failed to fetch exercises by type')
    }
    
    return data.map((exercise: ExercisesRow): Exercise => ({
      ...exercise,
      type: exercise.type as ExerciseType,
      difficulty: exercise.difficulty as DifficultyLevel | null,
      min_subscription_tier: exercise.min_subscription_tier as SubscriptionTier,
      requires_subscription: exercise.requires_subscription ?? false,
      is_active: exercise.is_active ?? true,
      tags: exercise.tags as string[] | null,
      config: exercise.config as Json,
      created_at: exercise.created_at ?? new Date().toISOString(),
      updated_at: exercise.updated_at ?? new Date().toISOString()
    }))
  }
  
  // Get exercise texts for a specific exercise type
  static async getExerciseTexts(
    exerciseType?: ExerciseType, 
    difficulty?: DifficultyLevel,
    isPublic = true
  ): Promise<ExerciseText[]> {
    const supabase = createTypedClient()
    let query = supabase
      .from('exercise_texts')
      .select('*')
    
    if (isPublic) {
      query = query.eq('is_public', true)
    } else {
      // Get user's own texts
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        query = query.or(`is_public.eq.true,created_by.eq.${user.id}`)
      }
    }
    
    if (exerciseType) {
      query = query.eq('exercise_type', exerciseType)
    }
    
    if (difficulty) {
      query = query.eq('difficulty_level', difficulty)
    }
    
    query = query.order('created_at', { ascending: false })
    
    const { data, error } = await query
    
    if (error) {
      throw new Error('Failed to fetch exercise texts')
    }
    
    return data.map((text: Record<string, unknown>): ExerciseText => ({
      ...text,
      is_custom: (text.is_custom as boolean) ?? false,
      word_count: (text.word_count as number) ?? 0,
      created_at: (text.created_at as string) ?? new Date().toISOString()
    } as ExerciseText))
  }
  
  // Get user's exercise statistics
  static async getUserExerciseStats(exerciseType?: ExerciseType): Promise<UserExerciseStats[]> {
    const supabase = createTypedClient()
    let query = supabase
      .from('user_exercise_stats')
      .select('*')
    
    if (exerciseType) {
      query = query.eq('exercise_type', exerciseType)
    }
    
    const { data, error } = await query
    
    if (error) {
      throw new Error('Failed to fetch user exercise stats')
    }
    
    return (data || []).map((stat: Record<string, unknown>): UserExerciseStats => ({
      ...stat,
      total_sessions: (stat.total_sessions as number) ?? 0,
      total_time_spent: (stat.total_time_spent as number) ?? 0,
      best_score: (stat.best_score as number) ?? 0,
      best_accuracy: (stat.best_accuracy as number) ?? 0,
      best_wpm: (stat.best_wpm as number) ?? 0,
      average_score: (stat.average_score as number) ?? 0,
      average_accuracy: (stat.average_accuracy as number) ?? 0,
      average_wpm: (stat.average_wpm as number) ?? 0,
      consecutive_sessions: (stat.consecutive_sessions as number) ?? 0,
      adaptive_speed: (stat.adaptive_speed as number) ?? 0,
      adaptive_multiplier: (stat.adaptive_multiplier as number) ?? 0,
      created_at: (stat.created_at as string) ?? new Date().toISOString(),
      updated_at: (stat.updated_at as string) ?? new Date().toISOString()
    } as UserExerciseStats))
  }
  
  // Submit exercise result
  static async submitExerciseResult(request: CreateExerciseResultRequest): Promise<ExerciseResult> {
    const supabase = createTypedClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('User must be authenticated')
    }
    
    // Check if user has premium subscription
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single()
    
    const wasPremium = profile?.subscription_tier !== 'free'
    
    const exerciseResult: ExerciseResultsInsert = {
      user_id: user.id,
      exercise_id: request.exerciseId,
      session_date: new Date().toISOString(),
      accuracy_percentage: request.results.accuracy,
      wpm: request.results.wordsPerMinute || null,
      completion_time: request.results.timeSpent,
      total_attempts: request.results.totalAttempts,
      correct_count: request.results.correctCount,
      metadata: {
        settings: request.settings as Json,
        was_premium: wasPremium,
        exercise_text_id: request.textId || null,
        score: request.results.score
      } as Json
    }
    
    const { data, error } = await supabase
      .from('exercise_results')
      .insert(exerciseResult)
      .select()
      .single()
    
    if (error) {
      throw new Error('Failed to submit exercise result')
    }
    
    return {
      ...data,
      total_attempts: data.total_attempts ?? 0,
      correct_count: data.correct_count ?? 0,
      created_at: data.created_at ?? new Date().toISOString()
    }
  }
  
  // Get user's exercise results
  static async getUserExerciseResults(
    exerciseType?: ExerciseType,
    limit = 10,
    offset = 0
  ): Promise<ExerciseResult[]> {
    const supabase = createTypedClient()
    let query = supabase
      .from('exercise_results')
      .select(`
        *,
        exercise:exercises(*)
      `)
    
    if (exerciseType) {
      query = query.eq('exercise.type', exerciseType)
    }
    
    const { data, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    
    if (error) {
      throw new Error('Failed to fetch exercise results')
    }
    
    return (data || []).map((result: Record<string, unknown>): ExerciseResult => ({
      ...result,
      total_attempts: (result.total_attempts as number) ?? 0,
      correct_count: (result.correct_count as number) ?? 0,
      created_at: (result.created_at as string) ?? new Date().toISOString(),
      exercise: result.exercise ? {
        ...(result.exercise as Record<string, unknown>),
        type: (result.exercise as Record<string, unknown>).type as ExerciseType,
        difficulty: (result.exercise as Record<string, unknown>).difficulty as DifficultyLevel | null,
        min_subscription_tier: (result.exercise as Record<string, unknown>).min_subscription_tier as SubscriptionTier,
        requires_subscription: ((result.exercise as Record<string, unknown>).requires_subscription as boolean) ?? false,
        is_active: ((result.exercise as Record<string, unknown>).is_active as boolean) ?? true,
        tags: (result.exercise as Record<string, unknown>).tags as string[] | null,
        config: (result.exercise as Record<string, unknown>).config as Json,
        created_at: ((result.exercise as Record<string, unknown>).created_at as string) ?? new Date().toISOString(),
        updated_at: ((result.exercise as Record<string, unknown>).updated_at as string) ?? new Date().toISOString()
      } as Exercise : undefined
    } as ExerciseResult))
  }
  
  // Create custom exercise text
  static async createExerciseText(
    title: string,
    content: string,
    exerciseType: ExerciseType,
    difficulty: DifficultyLevel = 'beginner',
    /* isPublic = false */ // TODO: Implement public exercise texts
  ): Promise<ExerciseText> {
    const supabase = createTypedClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('User must be authenticated')
    }
    
    const { data, error } = await supabase
      .from('exercise_texts')
      .insert({
        title,
        text_content: content,
        difficulty_level: difficulty,
        is_custom: true,
        created_by: user.id
      })
      .select()
      .single()
    
    if (error) {
      throw new Error('Failed to create exercise text')
    }
    
    return {
      ...data,
      is_custom: data.is_custom ?? false,
      word_count: data.word_count ?? 0,
      created_at: data.created_at ?? new Date().toISOString()
    }
  }
  
  // Get vocabulary word lists for Word Flasher
  static getVocabularyWords(): Record<string, VocabularyWordList> {
    return {
      foundation: {
        level: 'foundation',
        words: [
          'the', 'and', 'you', 'that', 'was', 'for', 'are', 'with', 'his', 'they',
          'have', 'one', 'had', 'word', 'but', 'not', 'what', 'all', 'were', 'when',
          'your', 'can', 'said', 'each', 'which', 'she', 'how', 'will', 'now', 'many',
          'some', 'time', 'very', 'when', 'come', 'here', 'could', 'see', 'him', 'two',
          'more', 'go', 'no', 'way', 'find', 'use', 'may', 'say', 'part', 'over',
          'new', 'sound', 'take', 'only', 'little', 'work', 'know', 'place', 'year', 'live',
          'me', 'back', 'give', 'most', 'very', 'after', 'thing', 'our', 'name', 'good',
          'sentence', 'man', 'think', 'great', 'where', 'help', 'through', 'much', 'before', 'line',
          'right', 'too', 'means', 'old', 'any', 'same', 'tell', 'boy', 'follow', 'came',
          'want', 'show', 'also', 'around', 'farm', 'three', 'small', 'set', 'put', 'end'
        ]
      },
      intermediate: {
        level: 'intermediate',
        words: [
          'analyze', 'approach', 'available', 'benefit', 'concept', 'consist', 'context', 'create',
          'data', 'define', 'derive', 'distribute', 'economy', 'environment', 'establish', 'estimate',
          'evidence', 'export', 'factor', 'finance', 'formula', 'function', 'identify', 'income',
          'indicate', 'individual', 'interpret', 'involve', 'issue', 'labor', 'legal', 'major',
          'method', 'occur', 'percent', 'period', 'policy', 'principle', 'proceed', 'process',
          'require', 'research', 'respond', 'role', 'section', 'significant', 'similar', 'source',
          'specific', 'structure', 'theory', 'variable', 'achieve', 'acquire', 'administrate', 'affect',
          'appropriate', 'area', 'aspect', 'assist', 'assume', 'authority', 'available', 'benefit',
          'category', 'chapter', 'commission', 'community', 'complex', 'computer', 'concentrate', 'concept',
          'conclude', 'conduct', 'consequent', 'consider', 'constant', 'constitute', 'consume', 'contain'
        ]
      },
      advanced: {
        level: 'advanced',
        words: [
          'accommodate', 'acknowledge', 'aggregate', 'albeit', 'ambiguous', 'analogy', 'anticipate', 'arbitrary',
          'attribute', 'coherent', 'coincide', 'collapse', 'colloquial', 'complement', 'comprehensive', 'comprise',
          'conceive', 'concurrent', 'confer', 'configuration', 'confine', 'consequent', 'considerable', 'contemporary',
          'contradict', 'controversy', 'convention', 'correspond', 'criteria', 'crucial', 'deduce', 'demonstrate',
          'denote', 'differentiate', 'dimension', 'discrete', 'discriminate', 'displace', 'diverse', 'domain',
          'elaborate', 'emerge', 'emphasis', 'empirical', 'enable', 'encounter', 'enhance', 'enormous',
          'entity', 'equate', 'equivalent', 'erroneous', 'establish', 'evaluate', 'eventual', 'evident',
          'evolve', 'exceed', 'exclude', 'exhibit', 'explicit', 'exploit', 'external', 'facilitate',
          'fluctuate', 'forthcoming', 'fundamental', 'generate', 'hypothesis', 'identical', 'ideology', 'implicit',
          'incorporate', 'index', 'infrastructure', 'inherent', 'inhibit', 'initiate', 'innovation', 'instance'
        ]
      }
    }
  }
  
  // Calculate adaptive speed for Word Flasher based on performance
  static calculateAdaptiveSpeed(
    currentSpeed: number,
    accuracy: number,
    targetAccuracy = 75
  ): number {
    const config = {
      min_speed: 50,
      max_speed: 500,
      speed_adjustment: 10
    }
    
    if (accuracy > targetAccuracy) {
      // User is doing well, make it faster (lower milliseconds per word)
      return Math.max(config.min_speed, currentSpeed - config.speed_adjustment)
    } else if (accuracy < targetAccuracy) {
      // User needs more time, make it slower (higher milliseconds per word)
      return Math.min(config.max_speed, currentSpeed + config.speed_adjustment)
    }
    
    // Accuracy is at target, keep same speed
    return currentSpeed
  }
  
  // Generate personalized exercise recommendations
  static async getExerciseRecommendations(userId: string): Promise<Exercise[]> {
    // Get user's exercise history
    const stats = await this.getUserExerciseStats()
    
    // Get available exercises
    const supabase = createClient()
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', userId)
      .single()
    
    const exercises = await this.getAvailableExercises((profile?.subscription_tier as SubscriptionTier) || 'free')
    
    // Simple recommendation logic:
    // 1. Start with mindset exercise for new users
    // 2. Recommend exercises user hasn't tried
    // 3. Recommend next difficulty level for exercises user has completed
    
    const userExerciseTypes = stats.map(s => s.exercise_type)
    const unusedExercises = exercises.filter(e => !userExerciseTypes.includes(e.type))
    
    if (unusedExercises.length > 0) {
      // Prioritize mindset exercise for new users
      const mindsetExercise = unusedExercises.find(e => e.type === 'mindset')
      if (mindsetExercise) {
        return [mindsetExercise, ...unusedExercises.filter(e => e.type !== 'mindset').slice(0, 2)]
      }
      return unusedExercises.slice(0, 3)
    }
    
    // User has tried exercises, recommend based on performance
    return exercises.slice(0, 3)
  }
}

// Utility functions for exercise calculations
export const ExerciseUtils = {
  // Calculate words per minute from text and time
  calculateWPM(text: string, timeInSeconds: number): number {
    const wordCount = text.trim().split(/\s+/).length
    return Math.round((wordCount / timeInSeconds) * 60)
  },
  
  // Calculate accuracy percentage
  calculateAccuracy(correct: number, total: number): number {
    if (total === 0) return 0
    return Math.round((correct / total) * 100)
  },
  
  // Format time display
  formatTime(seconds: number): string {
    if (seconds < 60) {
      return `${seconds}s`
    }
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  },
  
  // Validate exercise settings
  validateExerciseSettings(settings: ExerciseSessionSettings): boolean {
    // Word Flasher validation
    if (settings.flashSpeed && (settings.flashSpeed < 50 || settings.flashSpeed > 500)) {
      return false
    }
    
    if (settings.wordsPerRound && (settings.wordsPerRound < 5 || settings.wordsPerRound > 50)) {
      return false
    }
    
    // Custom text validation
    if (settings.customText && (settings.customText.length < 50 || settings.customText.length > 5000)) {
      return false
    }
    
    return true
  },
  
  // Get difficulty color class
  getDifficultyColor(difficulty: DifficultyLevel): string {
    switch (difficulty) {
      case 'beginner':
        return 'text-green-600 bg-green-100'
      case 'intermediate':
        return 'text-yellow-600 bg-yellow-100'
      case 'advanced':
        return 'text-red-600 bg-red-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  },
  
  // Get exercise type display name
  getExerciseTypeName(type: ExerciseType): string {
    switch (type) {
      case 'word_flasher':
        return 'Word Flasher'
      case '3-2-1':
        return '3-2-1 Speed Reading'
      case 'mindset':
        return 'Mindset'
      case 'assessment':
        return 'Reading Assessment'
      case 'custom':
        return 'Custom Exercise'
      default:
        return 'Exercise'
    }
  }
}