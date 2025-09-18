'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { createAdminClient } from '@/lib/supabase/admin-client'
import { 
  BookOpen, 
  Clock, 
  TrendingUp, 
  Award, 
  Loader2,
  ChevronRight,
  Target,
  History
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import {
  getNextAssessmentForUser,
  checkUserAssessmentLimits,
  getUserAssessmentStats,
  getUserRecentResults
} from '@/lib/services/assessments'
import { UserAssessmentStats, AssessmentResult } from '@/lib/types/assessment'

export default function AssessmentsPageNew() {
  const [loading, setLoading] = useState(true)
  const [takingAssessment, setTakingAssessment] = useState(false)
  const [userStats, setUserStats] = useState<UserAssessmentStats | null>(null)
  const [recentResults, setRecentResults] = useState<AssessmentResult[]>([])
  const [canTakeAssessment, setCanTakeAssessment] = useState(true)
  const [limitMessage, setLimitMessage] = useState<string>('')
  const [remainingAssessments, setRemainingAssessments] = useState<{
    daily: number | null
    monthly: number | null
  }>({ daily: null, monthly: null })
  
  const { toast } = useToast()
  const router = useRouter()

  const loadUserData = useCallback(async () => {
    try {
      setLoading(true)
      const adminClient = createAdminClient()
      const { data: { user } } = await adminClient.auth.getUser()
      
      if (!user) {
        router.push('/auth/login')
        return
      }

      // Load user stats
      const stats = await getUserAssessmentStats(user.id)
      setUserStats(stats)

      // Load recent results
      const results = await getUserRecentResults(user.id, 5)
      setRecentResults(results)

      // Check assessment limits
      const limitCheck = await checkUserAssessmentLimits(user.id)
      setCanTakeAssessment(limitCheck.canTake)
      setLimitMessage(limitCheck.reason || '')
      setRemainingAssessments({
        daily: limitCheck.dailyRemaining === -1 ? null : limitCheck.dailyRemaining,
        monthly: limitCheck.monthlyRemaining === -1 ? null : limitCheck.monthlyRemaining
      })
    } catch (error) {
      console.error('Error loading user data:', error)
      toast({
        title: 'Error',
        description: 'Failed to load assessment data',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [router, toast])

  useEffect(() => {
    loadUserData()
  }, [loadUserData])

  const handleTakeAssessment = async () => {
    try {
      setTakingAssessment(true)
      const adminClient = createAdminClient()
      const { data: { user } } = await adminClient.auth.getUser()
      
      if (!user) {
        router.push('/auth/login')
        return
      }

      // Check limits again
      const limitCheck = await checkUserAssessmentLimits(user.id)
      if (!limitCheck.canTake) {
        toast({
          title: 'Assessment Limit Reached',
          description: limitCheck.reason,
          variant: 'destructive'
        })
        setCanTakeAssessment(false)
        setLimitMessage(limitCheck.reason || '')
        return
      }

      // Get next assessment
      const nextAssessmentId = await getNextAssessmentForUser(user.id)
      
      if (!nextAssessmentId) {
        toast({
          title: 'No Assessments Available',
          description: 'All assessments have been completed. Check back later for new content.',
          variant: 'default'
        })
        return
      }

      // Navigate to assessment
      router.push(`/assessments/${nextAssessmentId}`)
    } catch (error) {
      console.error('Error starting assessment:', error)
      toast({
        title: 'Error',
        description: 'Failed to start assessment',
        variant: 'destructive'
      })
    } finally {
      setTakingAssessment(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reading Assessments</h1>
        <p className="text-muted-foreground mt-2">
          Track your reading speed and comprehension progress
        </p>
      </div>

      {/* Statistics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Speed</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {userStats?.average_wpm || 0} WPM
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Words per minute
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Comprehension</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {userStats?.average_comprehension 
                ? Math.round(userStats.average_comprehension) 
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Average accuracy
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {userStats?.total_assessments_taken || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total assessments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Remaining</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {remainingAssessments.monthly === null 
                ? '∞' 
                : remainingAssessments.monthly}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              This month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Last Assessment Result */}
      {userStats?.last_assessment_id && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Last Assessment Result
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Reading Speed</p>
                <p className="text-2xl font-bold">{userStats.last_assessment_wpm} WPM</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Comprehension</p>
                <p className="text-2xl font-bold">
                  {userStats.last_assessment_comprehension 
                    ? Math.round(userStats.last_assessment_comprehension) 
                    : 0}%
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Date</p>
                <p className="text-lg font-medium">
                  {userStats.last_assessment_date 
                    ? new Date(userStats.last_assessment_date).toLocaleDateString()
                    : 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Take Assessment Section */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="text-xl">Ready for Your Next Assessment?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {canTakeAssessment ? (
            <>
              <p className="text-muted-foreground">
                Click below to start your next reading assessment. The system will automatically 
                select the best assessment for you based on your history.
              </p>
              
              {remainingAssessments.daily !== null && (
                <div className="flex items-center gap-4 text-sm">
                  <Badge variant="secondary">
                    Daily: {remainingAssessments.daily} remaining
                  </Badge>
                  {remainingAssessments.monthly !== null && (
                    <Badge variant="secondary">
                      Monthly: {remainingAssessments.monthly} remaining
                    </Badge>
                  )}
                </div>
              )}

              <Button 
                size="lg" 
                className="w-full md:w-auto"
                onClick={handleTakeAssessment}
                disabled={takingAssessment}
              >
                {takingAssessment ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading Assessment...
                  </>
                ) : (
                  <>
                    Take Assessment
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </>
          ) : (
            <div className="space-y-4">
              <div className="bg-destructive/10 text-destructive rounded-lg p-4">
                <p className="font-medium">{limitMessage}</p>
              </div>
              <Button variant="outline" size="lg" className="w-full md:w-auto">
                Upgrade Subscription
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent History */}
      {recentResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <History className="h-5 w-5" />
              Recent Assessment History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentResults.map((result) => (
                <div 
                  key={result.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">
                      {new Date(result.created_at || '').toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-sm font-medium">{result.wpm} WPM</p>
                      <p className="text-xs text-muted-foreground">Speed</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {result.comprehension_percentage 
                          ? Math.round(result.comprehension_percentage) 
                          : 0}%
                      </p>
                      <p className="text-xs text-muted-foreground">Comprehension</p>
                    </div>
                    {result.comparison_percentile && (
                      <Badge variant="outline">
                        Top {100 - result.comparison_percentile}%
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}