'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Users, 
  BookOpen, 
  Activity, 
  TrendingUp, 
  Clock,
  BarChart3,
  Eye,
  Calendar,
  Target,
  Star
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface AnalyticsData {
  overview: {
    totalUsers: number
    totalBooks: number
    totalSubmissions: number
    totalExercises: number
    avgSessionTime: number
    avgPagesPerSession: number
  }
  engagement: {
    dailyActiveUsers: number
    weeklyActiveUsers: number
    monthlyActiveUsers: number
    averageSessionsPerUser: number
    retentionRate: number
  }
  content: {
    topBooks: Array<{ id: string; title: string; author: string; submissions: number }>
    topExercises: Array<{ id: string; title: string; completions: number }>
    newBooksThisMonth: number
    pendingApprovals: number
  }
  performance: {
    avgReadingSpeed: number
    avgExerciseAccuracy: number
    completionRates: {
      books: number
      exercises: number
      assessments: number
    }
  }
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData>({
    overview: {
      totalUsers: 0,
      totalBooks: 0,
      totalSubmissions: 0,
      totalExercises: 0,
      avgSessionTime: 0,
      avgPagesPerSession: 0
    },
    engagement: {
      dailyActiveUsers: 0,
      weeklyActiveUsers: 0,
      monthlyActiveUsers: 0,
      averageSessionsPerUser: 0,
      retentionRate: 0
    },
    content: {
      topBooks: [],
      topExercises: [],
      newBooksThisMonth: 0,
      pendingApprovals: 0
    },
    performance: {
      avgReadingSpeed: 0,
      avgExerciseAccuracy: 0,
      completionRates: {
        books: 0,
        exercises: 0,
        assessments: 0
      }
    }
  })
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchAnalyticsData = useCallback(async () => {
    setLoading(true)
    try {
      // Get basic counts
      const [
        usersResult,
        booksResult,
        submissionsResult,
        exercisesResult
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('books').select('*', { count: 'exact', head: true }),
        supabase.from('reading_submissions').select('*', { count: 'exact', head: true }),
        supabase.from('exercise_results').select('*', { count: 'exact', head: true })
      ])

      // Calculate time-based active users
      const now = new Date()
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

      const [dailyActiveResult, weeklyActiveResult, monthlyActiveResult] = await Promise.all([
        supabase
          .from('reading_submissions')
          .select('user_id', { count: 'exact', head: true })
          .gte('created_at', oneDayAgo.toISOString()),
        supabase
          .from('reading_submissions')
          .select('user_id', { count: 'exact', head: true })
          .gte('created_at', oneWeekAgo.toISOString()),
        supabase
          .from('reading_submissions')
          .select('user_id', { count: 'exact', head: true })
          .gte('created_at', oneMonthAgo.toISOString())
      ])

      // Get top books by submission count (without relation)
      const { data: topBooksData } = await supabase
        .from('reading_submissions')
        .select('book_id')
        .limit(1000)

      // Get book details separately
      let bookDetails: Record<string, { title: string; author: string }> = {}
      if (topBooksData && topBooksData.length > 0) {
        const bookIds = [...new Set(topBooksData.map(s => s.book_id))]
        const { data: booksData } = await supabase
          .from('books')
          .select('id, title, author')
          .in('id', bookIds)
        
        if (booksData) {
          bookDetails = booksData.reduce((acc, book) => {
            acc[book.id] = {
              title: book.title || 'Unknown',
              author: book.author || 'Unknown'
            }
            return acc
          }, {} as Record<string, { title: string; author: string }>)
        }
      }

      // Process top books
      const bookCounts = topBooksData?.reduce((acc: Record<string, { id: string; title: string; author: string; submissions: number }>, submission: { book_id: string }) => {
        const bookId = submission.book_id
        if (!acc[bookId]) {
          acc[bookId] = {
            id: bookId,
            title: bookDetails[bookId]?.title || 'Unknown',
            author: bookDetails[bookId]?.author || 'Unknown',
            submissions: 0
          }
        }
        acc[bookId].submissions++
        return acc
      }, {})

      const topBooks = Object.values(bookCounts || {})
        .sort((a, b) => b.submissions - a.submissions)
        .slice(0, 5)

      // Get average stats
      const { data: submissionStats } = await supabase
        .from('reading_submissions')
        .select('pages_read, time_spent')

      const avgPages = submissionStats?.length ? 
        submissionStats.reduce((sum, s) => sum + s.pages_read, 0) / submissionStats.length : 0
      const avgTime = submissionStats?.length ?
        submissionStats.reduce((sum, s) => sum + s.time_spent, 0) / submissionStats.length : 0

      // Get pending books
      const { count: pendingBooksCount } = await supabase
        .from('books')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')

      // Calculate average reading speed
      const avgSpeed = avgTime > 0 ? (avgPages / avgTime) * 60 : 0

      setData({
        overview: {
          totalUsers: usersResult.count || 0,
          totalBooks: booksResult.count || 0,
          totalSubmissions: submissionsResult.count || 0,
          totalExercises: exercisesResult.count || 0,
          avgSessionTime: Math.round(avgTime),
          avgPagesPerSession: Math.round(avgPages)
        },
        engagement: {
          dailyActiveUsers: dailyActiveResult.count || 0,
          weeklyActiveUsers: weeklyActiveResult.count || 0,
          monthlyActiveUsers: monthlyActiveResult.count || 0,
          averageSessionsPerUser: usersResult.count ? 
            Math.round((submissionsResult.count || 0) / usersResult.count) : 0,
          retentionRate: 0 // Would need complex calculation based on user return patterns
        },
        content: {
          topBooks: topBooks as { id: string; title: string; author: string; submissions: number }[],
          topExercises: [], // Would need actual exercise completion data
          newBooksThisMonth: 0, // Would need date-based book filtering
          pendingApprovals: pendingBooksCount || 0
        },
        performance: {
          avgReadingSpeed: Math.round(avgSpeed),
          avgExerciseAccuracy: 0, // Would need actual exercise results
          completionRates: {
            books: 0, // Would need book completion tracking
            exercises: 0, // Would need exercise completion data
            assessments: 0 // Would need assessment completion data
          }
        }
      })

    } catch (error) {
      console.error('Error fetching analytics data:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchAnalyticsData()
  }, [fetchAnalyticsData])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Comprehensive insights into platform performance and user behavior
          </p>
        </div>
        <Button onClick={fetchAnalyticsData} disabled={loading}>
          <BarChart3 className="h-4 w-4 mr-2" />
          Refresh Data
        </Button>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loading ? '...' : data.overview.totalUsers.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  Registered platform users
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Books</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loading ? '...' : data.overview.totalBooks.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  Books in library
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Reading Sessions</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loading ? '...' : data.overview.totalSubmissions.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  Total submissions
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Exercise Sessions</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loading ? '...' : data.overview.totalExercises.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  Exercise completions
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Session Time</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loading ? '...' : `${data.overview.avgSessionTime}m`}
                </div>
                <p className="text-xs text-muted-foreground">
                  Minutes per session
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Pages/Session</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loading ? '...' : data.overview.avgPagesPerSession}
                </div>
                <p className="text-xs text-muted-foreground">
                  Pages per session
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="engagement" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Daily Active Users</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loading ? '...' : data.engagement.dailyActiveUsers.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  Active in last 24 hours
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Weekly Active Users</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loading ? '...' : data.engagement.weeklyActiveUsers.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  Active in last 7 days
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Monthly Active Users</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loading ? '...' : data.engagement.monthlyActiveUsers.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  Active in last 30 days
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Sessions/User</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loading ? '...' : data.engagement.averageSessionsPerUser}
                </div>
                <p className="text-xs text-muted-foreground">
                  Sessions per user
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Retention Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loading ? '...' : `${data.engagement.retentionRate}%`}
                </div>
                <p className="text-xs text-muted-foreground">
                  30-day retention
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="content" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Top Books by Reading Sessions</CardTitle>
                <CardDescription>Most popular books on the platform</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.content.topBooks.map((book, index) => (
                    <div key={book.id} className="flex items-center gap-3">
                      <Badge variant="outline" className="w-8 h-8 rounded-full flex items-center justify-center">
                        {index + 1}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{book.title}</p>
                        <p className="text-sm text-muted-foreground truncate">{book.author}</p>
                      </div>
                      <Badge variant="secondary">
                        {book.submissions} reads
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Exercises</CardTitle>
                <CardDescription>Most completed exercises</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.content.topExercises.map((exercise, index) => (
                    <div key={exercise.id} className="flex items-center gap-3">
                      <Badge variant="outline" className="w-8 h-8 rounded-full flex items-center justify-center">
                        {index + 1}
                      </Badge>
                      <div className="flex-1">
                        <p className="font-medium">{exercise.title}</p>
                      </div>
                      <Badge variant="secondary">
                        {exercise.completions} completions
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">New Books This Month</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.content.newBooksThisMonth}</div>
                <p className="text-xs text-muted-foreground">
                  Books added this month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.content.pendingApprovals}</div>
                <p className="text-xs text-muted-foreground">
                  Books awaiting approval
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Reading Speed</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loading ? '...' : `${data.performance.avgReadingSpeed} p/h`}
                </div>
                <p className="text-xs text-muted-foreground">
                  Pages per hour
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Exercise Accuracy</CardTitle>
                <Star className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loading ? '...' : `${data.performance.avgExerciseAccuracy}%`}
                </div>
                <p className="text-xs text-muted-foreground">
                  Average accuracy
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Book Completion</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loading ? '...' : `${data.performance.completionRates.books}%`}
                </div>
                <p className="text-xs text-muted-foreground">
                  Completion rate
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Exercise Completion</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loading ? '...' : `${data.performance.completionRates.exercises}%`}
                </div>
                <p className="text-xs text-muted-foreground">
                  Exercise completion
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Assessment Completion</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loading ? '...' : `${data.performance.completionRates.assessments}%`}
                </div>
                <p className="text-xs text-muted-foreground">
                  Assessment completion
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}