import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type {
  ExerciseResultsInsert,
  UserExerciseStatsInsert,
  UserExerciseStatsUpdate
} from '@/lib/supabase/typed-client'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const exerciseType = searchParams.get('exercise_type')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = supabase
      .from('exercise_results')
      .select(`
        *,
        exercise:exercises!exercise_id (
          id,
          title,
          type,
          difficulty
        )
      `)
      .eq('user_id', user.id)

    if (exerciseType) {
      query = query.eq('exercise.type', exerciseType)
    }

    const { data: results, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching exercise results:', error)
      return NextResponse.json({ error: 'Failed to fetch results' }, { status: 500 })
    }

    return NextResponse.json({ results })
  } catch (error) {
    console.error('Error in GET /api/exercises/results:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      exercise_id, 
      accuracy_percentage, 
      total_attempts, 
      correct_count, 
      completion_time, 
      wpm, 
      metadata 
    } = body

    // Note: Premium subscription check could be used for additional features

    // Insert exercise result
    const exerciseResult: ExerciseResultsInsert = {
      user_id: user.id,
      exercise_id,
      accuracy_percentage,
      total_attempts,
      correct_count,
      completion_time,
      wpm,
      metadata: metadata || {},
      session_date: new Date().toISOString().split('T')[0]
    }
    
    const { data: result, error } = await supabase
      .from('exercise_results')
      .insert(exerciseResult)
      .select()
      .single()

    if (error) {
      console.error('Error creating exercise result:', error)
      return NextResponse.json({ error: 'Failed to save result' }, { status: 500 })
    }

    // Update user exercise stats
    await updateUserExerciseStats(supabase, user.id, exercise_id, {
      accuracy_percentage,
      total_attempts,
      correct_count,
      completion_time,
      wpm
    })

    return NextResponse.json({ result })
  } catch (error) {
    console.error('Error in POST /api/exercises/results:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Helper function to update user exercise stats
async function updateUserExerciseStats(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  exerciseId: string,
  newResult: {
    accuracy_percentage?: number
    total_attempts: number
    correct_count: number
    completion_time?: number
    wpm?: number
  }
) {
  // Get exercise type
  const { data: exercise } = await supabase
    .from('exercises')
    .select('type')
    .eq('id', exerciseId)
    .single()

  if (!exercise) return

  // Get or create user stats for this exercise type
  const { data: existingStats } = await supabase
    .from('user_exercise_stats')
    .select('*')
    .eq('user_id', userId)
    .eq('exercise_type', exercise.type)
    .single()

  if (!existingStats) {
    // Create new stats record
    const newStats: UserExerciseStatsInsert = {
      user_id: userId,
      exercise_type: exercise.type,
      total_sessions: 1,
      total_time_spent: newResult.completion_time || 0,
      best_score: newResult.accuracy_percentage || 0,
      best_accuracy: newResult.accuracy_percentage || 0,
      best_wpm: newResult.wpm || 0,
      average_score: newResult.accuracy_percentage || 0,
      average_accuracy: newResult.accuracy_percentage || 0,
      average_wpm: newResult.wpm || 0,
      last_session_at: new Date().toISOString()
    }
    
    await supabase
      .from('user_exercise_stats')
      .insert(newStats)
  } else {
    // Update existing stats
    const sessions = (existingStats.total_sessions || 0) + 1
    const totalTime = (existingStats.total_time_spent || 0) + (newResult.completion_time || 0)
    
    const updatedStats: UserExerciseStatsUpdate = {
      total_sessions: sessions,
      total_time_spent: totalTime,
      best_score: Math.max(existingStats.best_score || 0, newResult.accuracy_percentage || 0),
      best_accuracy: Math.max(existingStats.best_accuracy || 0, newResult.accuracy_percentage || 0),
      best_wpm: Math.max(existingStats.best_wpm || 0, newResult.wpm || 0),
      average_score: (
        ((existingStats.average_score || 0) * (existingStats.total_sessions || 0) + (newResult.accuracy_percentage || 0)) 
        / sessions
      ),
      average_accuracy: (
        ((existingStats.average_accuracy || 0) * (existingStats.total_sessions || 0) + (newResult.accuracy_percentage || 0))
        / sessions
      ),
      average_wpm: newResult.wpm ? (
        ((existingStats.average_wpm || 0) * (existingStats.total_sessions || 0) + newResult.wpm)
        / sessions
      ) : existingStats.average_wpm,
      last_session_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    await supabase
      .from('user_exercise_stats')
      .update(updatedStats)
      .eq('user_id', userId)
      .eq('exercise_type', exercise.type)
  }
}