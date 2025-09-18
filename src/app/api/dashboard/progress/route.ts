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
    const { userId, startDate, endDate, timeRange } = body

    // Validate that the requesting user matches the userId
    if (user.id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Parse dates
    const start = parseISO(startDate)
    const end = parseISO(endDate)

    // Get reading submissions for the date range
    const { data: submissions, error } = await supabase
      .from('reading_submissions')
      .select('pages_read, created_at, submission_date')
      .eq('user_id', userId)
      .gte('submission_date', format(start, 'yyyy-MM-dd'))
      .lte('submission_date', format(end, 'yyyy-MM-dd'))
      .order('submission_date', { ascending: true })

    if (error) {
      console.error('Error fetching submissions:', error)
      return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 })
    }

    // Group submissions by date and sum pages
    const pagesByDate = new Map<string, number>()
    
    submissions?.forEach(submission => {
      const date = submission.submission_date || format(new Date(submission.created_at!), 'yyyy-MM-dd')
      const pages = submission.pages_read || 0
      pagesByDate.set(date, (pagesByDate.get(date) || 0) + pages)
    })

    // Generate chart data for all days in range
    const dateInterval = eachDayOfInterval({ start, end })
    const chartData = dateInterval.map(date => {
      const dateStr = format(date, 'yyyy-MM-dd')
      const pages = pagesByDate.get(dateStr) || 0
      
      return {
        date: dateStr,
        pages,
        formattedDate: timeRange === 'week' 
          ? format(date, 'EEE') 
          : timeRange === 'month'
          ? format(date, 'MMM d')
          : format(date, 'MMM yyyy')
      }
    })

    return NextResponse.json({ data: chartData })

  } catch (error) {
    console.error('Error in dashboard progress API:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 })
  }
}