import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { StatisticsCards } from '@/components/dashboard/statistics-cards'
import { CurrentBookWidget } from '@/components/dashboard/current-book-widget'
import { RecentActivity } from '@/components/dashboard/recent-activity'
import { ProgressChart } from '@/components/dashboard/progress-chart'
import { MobileDashboard } from '@/components/dashboard/mobile-dashboard'

function calculateReadingStreak(submissions: { created_at: string | null }[]): number {
  if (!submissions || submissions.length === 0) return 0
  
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  let streak = 0
  const currentDate = new Date(today)
  
  const submissionDates = new Set(
    submissions
      .filter(s => s.created_at !== null)
      .map(s => {
        const date = new Date(s.created_at!)
        date.setHours(0, 0, 0, 0)
        return date.getTime()
      })
  )
  
  // Check consecutive days starting from today
  while (submissionDates.has(currentDate.getTime())) {
    streak++
    currentDate.setDate(currentDate.getDate() - 1)
  }
  
  return streak
}

export default async function DashboardPage() {
  const supabase = await createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Calculate statistics from actual data
  const { data: submissions } = await supabase
    .from('reading_submissions')
    .select('pages_read, time_spent, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const totalPagesRead = profile?.total_pages_read || 0
  const totalTimeSpent = submissions?.reduce((sum, s) => sum + (s.time_spent || 0), 0) || 0
  const averageReadingPace = totalTimeSpent > 0 ? Math.round((totalPagesRead / totalTimeSpent) * 60) : 0
  
  // Calculate reading streak from actual submissions
  const activeReadingStreak = calculateReadingStreak(submissions || [])

  const stats = {
    totalPagesRead,
    totalTimeSpent,
    averageReadingPace,
    activeReadingStreak,
    trends: {
      pagesReadTrend: 0,
      timeSpentTrend: 0,
      readingPaceTrend: 0,
      streakStatus: activeReadingStreak > 0 ? 'active' as const : 'broken' as const,
    }
  }

  // Get current book from latest submission
  const { data: latestSubmission } = await supabase
    .from('reading_submissions')
    .select('id, book_id, pages_read, time_spent, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  let currentBook = null
  if (latestSubmission && latestSubmission.book_id) {
    const { data: book } = await supabase
      .from('books')
      .select('id, title, author, total_pages, cover_url')
      .eq('id', latestSubmission.book_id)
      .single()
    
    if (book && latestSubmission.created_at) {
      // Calculate cumulative pages read for this book
      const { data: allSubmissions } = await supabase
        .from('reading_submissions')
        .select('pages_read')
        .eq('user_id', user.id)
        .eq('book_id', book.id)
        .order('created_at', { ascending: true })
      
      const totalPagesReadForBook = allSubmissions?.reduce((sum, s) => sum + (s.pages_read || 0), 0) || 0
      
      currentBook = {
        id: book.id,
        title: book.title,
        author: book.author,
        coverUrl: book.cover_url || undefined,
        totalPages: book.total_pages || 0,
        currentPage: totalPagesReadForBook,
        lastReadDate: new Date(latestSubmission.created_at),
        averagePace: latestSubmission.time_spent > 0 ? Math.round((latestSubmission.pages_read / latestSubmission.time_spent) * 60) : 0,
      }
    }
  }

  // Get recent activity from database with book info
  const { data: recentSubmissions } = await supabase
    .from('reading_submissions')
    .select(`
      id, 
      pages_read, 
      time_spent, 
      created_at, 
      book_id,
      books (
        title,
        author
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5)

  const { data: recentExercises } = await supabase
    .from('exercise_results')
    .select('id, accuracy_percentage, wpm, created_at, exercise_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(3)

  // Combine and format recent activity
  const recentActivity = [
    ...(recentSubmissions || []).filter(s => s.created_at).map(submission => {
      const book = submission.books as { title?: string; author?: string } | null
      const bookTitle = book?.title || 'Unknown Book'
      
      return {
        id: submission.id,
        type: 'reading' as const,
        title: `Reading: ${bookTitle}`,
        description: `Read ${submission.pages_read} pages in ${submission.time_spent} minutes`,
        timestamp: new Date(submission.created_at!),
        metadata: {
          pages: submission.pages_read,
          minutes: submission.time_spent,
          bookTitle
        },
      }
    }),
    ...(recentExercises || []).filter(e => e.created_at).map(exercise => ({
      id: exercise.id,
      type: 'exercise' as const,
      title: 'Exercise Completed',
      description: exercise.accuracy_percentage ? 
        `Achieved ${Math.round(exercise.accuracy_percentage)}% accuracy` :
        `Completed exercise session`,
      timestamp: new Date(exercise.created_at!),
      metadata: {
        score: exercise.accuracy_percentage || 0,
        exerciseType: 'Exercise'
      },
    }))
  ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 5)

  // Format data for mobile dashboard
  const mobileStats = {
    totalPages: totalPagesRead,
    totalTime: totalTimeSpent,
    averageSpeed: averageReadingPace,
    booksCompleted: 0, // This would need book completion tracking
    weeklyGoal: 200,
    weeklyProgress: 145,
    currentStreak: activeReadingStreak,
  }

  const mobileRecentActivity = recentActivity
    .filter(activity => ['reading', 'exercise', 'assessment'].includes(activity.type))
    .slice(0, 3)
    .map(activity => ({
      id: activity.id,
      type: activity.type as 'reading' | 'exercise' | 'assessment',
      title: activity.title,
      date: activity.timestamp.toLocaleDateString(),
      score: activity.type === 'exercise' ? activity.metadata.score : undefined,
      pages: activity.type === 'reading' ? activity.metadata.pages : undefined,
    }))

  const quickActions = [
    {
      title: 'Start Reading',
      href: '/submit',
      icon: 'BookOpen',
      color: 'border-blue-300 hover:border-blue-400 text-blue-600',
      description: 'Log new session'
    },
    {
      title: 'Practice',
      href: '/exercises',
      icon: 'Dumbbell',
      color: 'border-purple-300 hover:border-purple-400 text-purple-600',
      description: 'Speed exercises'
    },
    {
      title: 'Take Test',
      href: '/assessments',
      icon: 'ClipboardCheck',
      color: 'border-green-300 hover:border-green-400 text-green-600',
      description: 'Check progress'
    },
    {
      title: 'View Rank',
      href: '/leaderboard',
      icon: 'Trophy',
      color: 'border-amber-300 hover:border-amber-400 text-amber-600',
      description: 'See standings'
    },
  ]

  return (
    <>
      {/* Mobile Dashboard */}
      <div className="lg:hidden">
        <MobileDashboard 
          stats={mobileStats}
          recentActivity={mobileRecentActivity}
          quickActions={quickActions}
        />
      </div>

      {/* Desktop Dashboard */}
      <div className="hidden lg:block space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome{profile?.full_name ? `, ${profile.full_name}` : ''}!
          </h1>
          <p className="text-muted-foreground">
            Track your reading progress and improve your speed.
          </p>
        </div>

        {/* Statistics Cards */}
        <StatisticsCards stats={stats} />

        {/* Progress Chart */}
        <ProgressChart userId={user.id} />

        {/* Current Book and Recent Activity */}
        <div className="grid gap-6 lg:grid-cols-2">
          {currentBook && <CurrentBookWidget currentBook={currentBook} />}
          <RecentActivity activities={recentActivity} />
        </div>
      </div>
    </>
  )
}