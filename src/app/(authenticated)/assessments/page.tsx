'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { createClient } from '@/lib/supabase/client'
import {
  Clock,
  TrendingUp,
  Award,
  Loader2,
  ChevronRight,
  Target,
  History,
  RefreshCw
} from 'lucide-react'
import { useRouter } from 'next/navigation'

interface AssessmentResult {
  id: string
  assessment_id: string
  wpm: number
  comprehension_percentage: number | null
  created_at: string
  assessment_texts?: {
    title: string
  }
}

export default function AssessmentsPageSimple() {
  const [loading, setLoading] = useState(true)
  const [takingAssessment, setTakingAssessment] = useState(false)
  const [recentResults, setRecentResults] = useState<AssessmentResult[]>([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [availableAssessments, setAvailableAssessments] = useState<any[]>([])
  
  const { toast } = useToast()
  const router = useRouter()

  const loadUserData = useCallback(async () => {
    try {
      setLoading(true)
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/auth/login')
        return
      }

      // Load available assessments via API
      try {
        const response = await fetch('/api/assessments?limit=10')
        if (!response.ok) throw new Error('Failed to fetch assessments')
        const data = await response.json()
        if (data.data) {
          setAvailableAssessments(data.data)
        }
      } catch (error) {
        console.error('Error fetching assessments:', error)
      }

      // Load recent results
      try {
        const response = await fetch('/api/assessments/results?limit=5')
        if (response.ok) {
          const data = await response.json()
          if (data.data) {
            setRecentResults(data.data)
          }
        }
      } catch (error) {
        console.error('Error fetching results:', error)
      }
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
    // Only load data once on mount
    let isMounted = true
    if (isMounted) {
      loadUserData()
    }
    return () => {
      isMounted = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Remove loadUserData from dependencies to prevent infinite loop

  const handleTakeAssessment = async () => {
    try {
      setTakingAssessment(true)
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/auth/login')
        return
      }

      if (availableAssessments.length === 0) {
        toast({
          title: 'No Assessments Available',
          description: 'No assessments are currently available.',
          variant: 'default'
        })
        return
      }

      // The API now returns assessments in weighted order (less taken ones first)
      // So we can just pick the first one, which will be the best choice
      const selectedAssessment = availableAssessments[0]

      // Show which assessment was selected and why
      const timesTaken = selectedAssessment.user_times_taken || 0
      if (timesTaken === 0) {
        toast({
          title: 'New Assessment Selected',
          description: `Starting "${selectedAssessment.title}" - You haven't taken this one yet!`,
          variant: 'default'
        })
      } else if (timesTaken === 1) {
        toast({
          title: 'Assessment Selected',
          description: `Starting "${selectedAssessment.title}" - You've taken this once before.`,
          variant: 'default'
        })
      } else {
        toast({
          title: 'Assessment Selected',
          description: `Starting "${selectedAssessment.title}" - You've taken this ${timesTaken} times.`,
          variant: 'default'
        })
      }

      // Navigate to assessment after a brief delay for toast
      setTimeout(() => {
        router.push(`/assessments/${selectedAssessment.id}`)
      }, 1000)
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

  // Calculate simple stats
  const totalTaken = recentResults.length
  const averageWpm = totalTaken > 0 
    ? Math.round(recentResults.reduce((sum, r) => sum + r.wpm, 0) / totalTaken)
    : 0
  const averageComprehension = totalTaken > 0
    ? Math.round(recentResults.reduce((sum, r) => sum + (r.comprehension_percentage || 0), 0) / totalTaken)
    : 0
  const lastResult = recentResults[0]

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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Speed</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageWpm} WPM</div>
            <p className="text-xs text-muted-foreground mt-1">Words per minute</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Comprehension</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageComprehension}%</div>
            <p className="text-xs text-muted-foreground mt-1">Average accuracy</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTaken}</div>
            <p className="text-xs text-muted-foreground mt-1">Total assessments</p>
          </CardContent>
        </Card>
      </div>

      {/* Last Assessment Result */}
      {lastResult && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Last Assessment Result
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <p className="text-sm text-muted-foreground">Assessment</p>
              <p className="text-lg font-semibold">{lastResult.assessment_texts?.title || 'Unknown Assessment'}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Reading Speed</p>
                <p className="text-2xl font-bold">{lastResult.wpm} WPM</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Comprehension</p>
                <p className="text-2xl font-bold">{lastResult.comprehension_percentage || 0}%</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Date</p>
                <p className="text-lg font-medium">
                  {new Date(lastResult.created_at).toLocaleDateString()}
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
          <p className="text-muted-foreground">
            The system intelligently selects assessments you haven&apos;t taken yet or taken less frequently.
          </p>

          {/* Show available assessments preview */}
          {availableAssessments.length > 0 && (
            <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">Available Assessments:</p>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => loadUserData()}
                  disabled={loading}
                  className="h-6 px-2"
                >
                  <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
                  <span className="ml-1 text-xs">Refresh</span>
                </Button>
              </div>
              <div className="space-y-1">
                {availableAssessments.slice(0, 3).map((assessment, index) => (
                  <div key={assessment.id} className="flex items-center justify-between text-sm">
                    <span className={index === 0 ? "font-medium" : "text-muted-foreground"}>
                      {index === 0 && "→ "}{assessment.title}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {assessment.user_times_taken === 0
                        ? "Never taken"
                        : `Taken ${assessment.user_times_taken}x`}
                    </span>
                  </div>
                ))}
                {availableAssessments.length > 3 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    ...and {availableAssessments.length - 3} more
                  </p>
                )}
              </div>
            </div>
          )}

          <Button
            size="lg"
            className="w-full md:w-auto"
            onClick={handleTakeAssessment}
            disabled={takingAssessment || availableAssessments.length === 0}
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
                      {new Date(result.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-sm font-medium">{result.wpm} WPM</p>
                      <p className="text-xs text-muted-foreground">Speed</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{result.comprehension_percentage || 0}%</p>
                      <p className="text-xs text-muted-foreground">Comprehension</p>
                    </div>
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