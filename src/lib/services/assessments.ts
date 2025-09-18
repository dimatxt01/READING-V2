/* eslint-disable @typescript-eslint/no-explicit-any */
import { createAdminClient } from '@/lib/supabase/admin-client'
import { 
  AssessmentText, 
  AssessmentResult, 
  UserAssessmentStats,
  AssessmentLimitCheck,
  AssessmentCompletionResponse,
  AssessmentSubmission
} from '@/lib/types/assessment'

// Get the next assessment for a user
export async function getNextAssessmentForUser(userId: string): Promise<string | null> {
  const adminClient = createAdminClient()
  
  try {
    // Try to call the database function to get next assessment
    const { data: rpcData, error: rpcError } = await (adminClient as any).rpc('get_next_assessment_for_user', {
      p_user_id: userId
    })
    
    if (!rpcError && rpcData) {
      return rpcData
    }
    
    // Fallback: If RPC doesn't exist, get a random active assessment
    console.warn('RPC function not available, using fallback selection')
    const { data: assessments, error: assessmentError } = await (adminClient as any)
      .from('assessment_texts')
      .select('id')
      .eq('active', true)
      .limit(1)
    
    if (assessmentError || !assessments || assessments.length === 0) {
      console.error('Error getting assessment:', assessmentError)
      return null
    }
    
    return assessments[0].id
  } catch (error) {
    console.error('Error in getNextAssessmentForUser:', error)
    return null
  }
}

// Check if user can take an assessment
export async function checkUserAssessmentLimits(userId: string): Promise<AssessmentLimitCheck> {
  const adminClient = createAdminClient()
  
  try {
    // First check if the RPC function exists, if not, return unlimited access
    const { data, error } = await (adminClient as any).rpc('can_user_take_assessment', {
      p_user_id: userId
    })
    
    if (error) {
      // If function doesn't exist or other error, allow unlimited access for now
      console.warn('Assessment limits not configured, allowing unlimited access:', error)
      return {
        canTake: true,
        reason: '',
        monthlyRemaining: -1,
        dailyRemaining: -1,
        tier: 'free'
      }
    }
    
    return {
      canTake: data.can_take,
      reason: data.reason,
      monthlyRemaining: data.monthly_remaining,
      dailyRemaining: data.daily_remaining,
      tier: data.tier,
      monthlyLimit: data.monthly_limit,
      dailyLimit: data.daily_limit,
      monthlyUsed: data.monthly_used,
      dailyUsed: data.daily_used
    }
  } catch (error) {
    // On any error, allow access but log the issue
    console.warn('Error in checkUserAssessmentLimits, allowing access:', error)
    return {
      canTake: true,
      reason: '',
      monthlyRemaining: -1,
      dailyRemaining: -1,
      tier: 'free'
    }
  }
}

// Get user assessment statistics
export async function getUserAssessmentStats(userId: string): Promise<UserAssessmentStats | null> {
  const adminClient = createAdminClient()
  
  try {
    const { data, error } = await (adminClient as any)
      .from('user_assessment_stats')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle() // Use maybeSingle() instead of single() to handle 0 rows
    
    if (error) {
      console.error('Error getting user stats:', error)
      return null
    }
    
    return data || null // Return null if no data exists
  } catch (error) {
    console.error('Error in getUserAssessmentStats:', error)
    return null
  }
}

// Submit assessment results
export async function submitAssessmentResult(
  submission: AssessmentSubmission
): Promise<AssessmentCompletionResponse | null> {
  const adminClient = createAdminClient()
  const sessionId = crypto.randomUUID()
  
  try {
    // Mock external API call for comprehension scoring
    // In production, this would call the actual external API
    const comprehensionScore = await mockExternalComprehensionAPI(submission.answers)
    
    // Calculate percentile
    let percentileData = 50 // Default to 50th percentile
    try {
      const { data, error } = await (adminClient as any).rpc('calculate_user_percentile', {
        p_assessment_id: submission.assessmentId,
        p_user_wpm: submission.wpm
      })
      if (!error && data) {
        percentileData = data
      }
    } catch (err) {
      console.warn('Percentile calculation not available, using default:', err)
    }
    
    // Insert the result
    const { data: resultData, error: resultError } = await (adminClient as any)
      .from('assessment_results')
      .insert({
        user_id: submission.userId,
        assessment_id: submission.assessmentId,
        wpm: submission.wpm,
        comprehension_percentage: comprehensionScore,
        time_taken: submission.timeSpent,
        answers: submission.answers,
        percentile: percentileData || 50,
        session_id: sessionId,
        comparison_percentile: percentileData || 50
      })
      .select()
      .single()
    
    if (resultError) {
      console.error('Error submitting assessment result:', resultError)
      return null
    }
    
    // Get attempt number
    const { data: attemptData } = await (adminClient as any)
      .from('assessment_attempt_logs')
      .select('attempt_count')
      .eq('user_id', submission.userId)
      .eq('assessment_id', submission.assessmentId)
      .single()
    
    return {
      id: resultData.id,
      wpm: submission.wpm,
      comprehensionPercentage: comprehensionScore,
      percentile: percentileData || 50,
      comparisonPercentile: percentileData || 50,
      attemptNumber: attemptData?.attempt_count || 1,
      message: `You read faster than ${percentileData || 50}% of users!`
    }
  } catch (error) {
    console.error('Error in submitAssessmentResult:', error)
    return null
  }
}

// Mock external comprehension API
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function mockExternalComprehensionAPI(answers: Record<string, string>): Promise<number> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500))
  
  // For now, always return 50% as requested
  // In production, this would:
  // 1. Send answers to external API
  // 2. Get back comprehension score (0-100)
  // 3. Return the score
  return 50
}

// Get recent assessment results for a user
export async function getUserRecentResults(
  userId: string, 
  limit: number = 5
): Promise<AssessmentResult[]> {
  const adminClient = createAdminClient()
  
  try {
    const { data, error } = await (adminClient as any)
      .from('assessment_results')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)
    
    if (error) {
      console.error('Error getting recent results:', error)
      return []
    }
    
    return data || []
  } catch (error) {
    console.error('Error in getUserRecentResults:', error)
    return []
  }
}

// Get assessment by ID
export async function getAssessmentById(assessmentId: string): Promise<AssessmentText | null> {
  const adminClient = createAdminClient()
  
  try {
    const { data, error } = await (adminClient as any)
      .from('assessment_texts')
      .select('*')
      .eq('id', assessmentId)
      .eq('active', true)
      .single()
    
    if (error) {
      console.error('Error getting assessment:', error)
      return null
    }
    
    return data
  } catch (error) {
    console.error('Error in getAssessmentById:', error)
    return null
  }
}

// Get all user attempts for an assessment
export async function getUserAssessmentAttempts(
  userId: string, 
  assessmentId: string
): Promise<AssessmentResult[]> {
  const adminClient = createAdminClient()
  
  try {
    const { data, error } = await (adminClient as any)
      .from('assessment_results')
      .select('*')
      .eq('user_id', userId)
      .eq('assessment_id', assessmentId)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error getting assessment attempts:', error)
      return []
    }
    
    return data || []
  } catch (error) {
    console.error('Error in getUserAssessmentAttempts:', error)
    return []
  }
}