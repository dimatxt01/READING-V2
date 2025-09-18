import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { format, eachDayOfInterval, parseISO } from 'date-fns'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { userIds, startDate, endDate, timeRange } = body

    // Validate that current user is in the list
    if (!userIds.includes(user.id)) {
      return NextResponse.json({ error: 'Current user must be included' }, { status: 403 })
    }

    // Limit to max 5 users for performance
    const limitedUserIds = userIds.slice(0, 5)

    // Parse dates
    const start = parseISO(startDate)
    const end = parseISO(endDate)

    // Fetch user profiles with avatars
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', limitedUserIds)

    if (profileError) {
      console.error('Error fetching profiles:', profileError)
    }

    // Get leaderboard rankings for users
    const { data: leaderboardData } = await supabase
      .from('reading_submissions')
      .select('user_id, pages_read')
      .gte('submission_date', format(start, 'yyyy-MM-dd'))
      .lte('submission_date', format(end, 'yyyy-MM-dd'))
      .in('user_id', limitedUserIds)

    // Calculate total pages per user for ranking
    const userTotals = new Map<string, number>()
    leaderboardData?.forEach(submission => {
      const current = userTotals.get(submission.user_id) || 0
      userTotals.set(submission.user_id, current + (submission.pages_read || 0))
    })

    // Sort users by total pages for ranking
    const sortedUsers = Array.from(userTotals.entries())
      .sort((a, b) => b[1] - a[1])
      .map((entry, index) => ({
        userId: entry[0],
        rank: index + 1,
        totalPages: entry[1]
      }))

    // Get reading submissions for all users in the date range
    const { data: submissions, error } = await supabase
      .from('reading_submissions')
      .select('user_id, pages_read, created_at, submission_date')
      .in('user_id', limitedUserIds)
      .gte('submission_date', format(start, 'yyyy-MM-dd'))
      .lte('submission_date', format(end, 'yyyy-MM-dd'))
      .order('submission_date', { ascending: true })

    if (error) {
      console.error('Error fetching submissions:', error)
      return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 })
    }

    // Group submissions by user and date
    const pagesByUserAndDate = new Map<string, Map<string, number>>()
    
    submissions?.forEach(submission => {
      const userId = submission.user_id
      const date = submission.submission_date || format(new Date(submission.created_at!), 'yyyy-MM-dd')
      const pages = submission.pages_read || 0
      
      if (!pagesByUserAndDate.has(userId)) {
        pagesByUserAndDate.set(userId, new Map())
      }
      
      const userMap = pagesByUserAndDate.get(userId)!
      userMap.set(date, (userMap.get(date) || 0) + pages)
    })

    // Generate chart data for all days in range
    const dateInterval = eachDayOfInterval({ start, end })
    const chartData = dateInterval.map(date => {
      const dateStr = format(date, 'yyyy-MM-dd')
      
      const point: Record<string, string | number> = {
        date: dateStr,
        formattedDate: timeRange === 'week' 
          ? format(date, 'EEE') 
          : timeRange === 'month'
          ? format(date, 'MMM d')
          : format(date, 'MMM yyyy')
      }
      
      // Add data for each user
      limitedUserIds.forEach((userId: string) => {
        const userPages = pagesByUserAndDate.get(userId)
        point[userId] = userPages?.get(dateStr) || 0
      })
      
      return point
    })

    // Prepare user data with profiles and rankings
    const usersData = limitedUserIds.map((userId: string) => {
      const profile = profiles?.find(p => p.id === userId)
      const ranking = sortedUsers.find(u => u.userId === userId)
      
      return {
        userId,
        userName: profile?.full_name || 'Anonymous',
        avatarUrl: profile?.avatar_url || null,
        rank: ranking?.rank || 999,
        totalPages: ranking?.totalPages || 0
      }
    }).sort((a: { userId: string; rank: number }, b: { userId: string; rank: number }) => {
      // Sort by: current user first, then by rank
      if (a.userId === user.id) return -1
      if (b.userId === user.id) return 1
      return a.rank - b.rank
    })

    return NextResponse.json({ 
      data: usersData,
      chartData 
    })

  } catch (error) {
    console.error('Error in leaderboard progress API:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 })
  }
}