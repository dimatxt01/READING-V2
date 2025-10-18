import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

interface LeaderboardRequest {
  timeRange: 'daily' | 'weekly' | 'monthly'
  limit?: number | 'all'
}

export async function POST(request: Request) {
  try {
    const { timeRange, limit = 10 } = await request.json() as LeaderboardRequest

    const supabase = await createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Convert 'all' to -1 for the RPC function (returns all when limit <= 0)
    const limitCount = limit === 'all' ? -1 : (typeof limit === 'number' ? limit : 10)

    // Calculate date range
    const now = new Date()
    let startDate: Date
    
    switch (timeRange) {
      case 'daily':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        break
      case 'weekly':
        const dayOfWeek = now.getDay()
        const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1 // Monday = 0
        startDate = new Date(now.getTime() - daysToSubtract * 24 * 60 * 60 * 1000)
        startDate.setHours(0, 0, 0, 0)
        break
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        break
      default:
        return NextResponse.json({ error: 'Invalid time range' }, { status: 400 })
    }

    // Get leaderboard data with privacy filtering
    const { data: leaderboardData, error: leaderboardError } = await (supabase as unknown as { rpc: (name: string, params: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }> })
      .rpc('get_leaderboard_with_privacy', {
        start_date: startDate.toISOString(),
        end_date: now.toISOString(),
        limit_count: limitCount
      })

    if (leaderboardError) {
      console.error('Leaderboard query error:', leaderboardError)
      return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 })
    }

    // Get current user's rank - NO PRIVACY CHECKS, ALL USERS INCLUDED
    let userRank = null

    const { data: userRankData, error: userRankError } = await (supabase as unknown as { rpc: (name: string, params: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }> })
      .rpc('get_user_leaderboard_rank', {
        target_user_id: user.id,
        start_date: startDate.toISOString(),
        end_date: now.toISOString()
      })

    if (!userRankError && userRankData && Array.isArray(userRankData) && userRankData.length > 0) {
      userRank = userRankData[0]  // Get the first (and only) object from the array
    }

    return NextResponse.json({
      leaderboard: leaderboardData || [],
      userRank,
      timeRange,
      lastUpdated: new Date().toISOString()
    })

  } catch (error) {
    console.error('Leaderboard API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}