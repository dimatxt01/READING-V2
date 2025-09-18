'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/components/ui/use-toast'
import { createAdminClient } from '@/lib/supabase/admin-client'
import { BookOpen, Clock, BarChart3, ArrowRight, Loader2 } from 'lucide-react'
import { AssessmentText } from '@/lib/types/database-extensions'
import Link from 'next/link'

export default function AssessmentsPage() {
  const [assessments, setAssessments] = useState<AssessmentText[]>([])
  const [loading, setLoading] = useState(true)
  const [userResults, setUserResults] = useState<Array<{
    id: string
    assessment_text_id: string
    reading_speed: number
    comprehension_score: number
    created_at: string
  }>>([])
  const { toast } = useToast()

  const fetchAssessments = useCallback(async () => {
    try {
      const adminClient = createAdminClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (adminClient as any)
        .from('assessment_texts')
        .select('*')
        .eq('active', true)
        .order('created_at', { ascending: false })

      if (error) throw error
      setAssessments(data || [])
    } catch (error) {
      console.error('Error fetching assessments:', error)
      toast({
        title: 'Error',
        description: 'Failed to load assessments',
        variant: 'destructive'
      })
    }
  }, [toast])

  const fetchUserResults = useCallback(async () => {
    try {
      const adminClient = createAdminClient()
      const { data: { user } } = await adminClient.auth.getUser()
      
      if (!user) return

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (adminClient as any)
        .from('assessment_results')
        .select('*')
        .eq('user_id', user.id)

      if (error) throw error
      setUserResults(data || [])
    } catch (error) {
      console.error('Error fetching user results:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAssessments()
    fetchUserResults()
  }, [fetchAssessments, fetchUserResults])

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'intermediate': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'advanced': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  const getUserResult = (assessmentId: string) => {
    return userResults.find(result => result.assessment_text_id === assessmentId)
  }

  const calculateAverageScore = () => {
    if (userResults.length === 0) return 0
    const total = userResults.reduce((sum, result) => sum + (result.comprehension_score || 0), 0)
    return Math.round(total / userResults.length)
  }

  const completedCount = userResults.length
  const averageScore = calculateAverageScore()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reading Assessments</h1>
        <p className="text-muted-foreground">
          Test and improve your reading speed and comprehension
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedCount}</div>
            <p className="text-xs text-muted-foreground">
              of {assessments.length} assessments
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageScore}%</div>
            <p className="text-xs text-muted-foreground">
              comprehension accuracy
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Progress</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {assessments.length > 0 ? Math.round((completedCount / assessments.length) * 100) : 0}%
            </div>
            <Progress 
              value={assessments.length > 0 ? (completedCount / assessments.length) * 100 : 0} 
              className="mt-2" 
            />
          </CardContent>
        </Card>
      </div>

      {/* Assessments Grid */}
      <div className="grid gap-6">
        <h2 className="text-xl font-semibold">Available Assessments</h2>
        
        {assessments.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Assessments Available</h3>
              <p className="text-muted-foreground text-center">
                Check back later for new reading assessments.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {assessments.map((assessment) => {
              const userResult = getUserResult(assessment.id)
              const isCompleted = !!userResult
              
              return (
                <Card key={assessment.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-lg line-clamp-2">
                          {assessment.title}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge className={getDifficultyColor(assessment.difficulty_level || 'intermediate')}>
                            {assessment.difficulty_level || 'intermediate'}
                          </Badge>
                          {assessment.category && (
                            <Badge variant="outline">{assessment.category}</Badge>
                          )}
                        </div>
                      </div>
                      {isCompleted && (
                        <Badge className="bg-green-100 text-green-800">
                          ✓ Done
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <div className="text-sm text-muted-foreground">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <BookOpen className="h-4 w-4" />
                          {assessment.word_count} words
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          ~{Math.ceil((assessment.word_count || 0) / 250)} min
                        </span>
                      </div>
                    </div>
                    
                    {isCompleted && userResult && (
                      <div className="bg-muted rounded-lg p-3 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Reading Speed:</span>
                          <span className="font-medium">{userResult.reading_speed} WPM</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Comprehension:</span>
                          <span className="font-medium">{userResult.comprehension_score}%</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Completed:</span>
                          <span className="font-medium">
                            {new Date(userResult.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex gap-2">
                      <Button 
                        asChild 
                        className="flex-1"
                        variant={isCompleted ? "outline" : "default"}
                      >
                        <Link href={`/assessments/${assessment.id}`}>
                          {isCompleted ? 'Retake' : 'Start'}
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}