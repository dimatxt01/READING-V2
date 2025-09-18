'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { createAdminClient } from '@/lib/supabase/admin-client'
import { 
  BookOpen, 
  Clock, 
  CheckCircle2, 
  ArrowLeft, 
  ArrowRight, 
  Loader2,
  Play,
  BarChart3,
  Trophy,
  TrendingUp,
  Target
} from 'lucide-react'
import { 
  getAssessmentById,
  submitAssessmentResult,
  checkUserAssessmentLimits
} from '@/lib/services/assessments'
import { 
  AssessmentText, 
  AssessmentStage,
  AssessmentQuestionFormat,
  AssessmentCompletionResponse
} from '@/lib/types/assessment'

interface UserAnswers {
  [key: number]: string
}

export default function AssessmentPageUpdated() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [assessment, setAssessment] = useState<AssessmentText | null>(null)
  const [questions, setQuestions] = useState<AssessmentQuestionFormat[]>([])
  const [loading, setLoading] = useState(true)
  const [stage, setStage] = useState<AssessmentStage>('intro')
  const [startTime, setStartTime] = useState<number | null>(null)
  const [endTime, setEndTime] = useState<number | null>(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [userAnswers, setUserAnswers] = useState<UserAnswers>({})
  const [submitting, setSubmitting] = useState(false)
  const [results, setResults] = useState<AssessmentCompletionResponse | null>(null)
  const [canTake, setCanTake] = useState(true)

  const fetchAssessment = useCallback(async () => {
    try {
      const adminClient = createAdminClient()
      const { data: { user } } = await adminClient.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }

      // Check if user can take assessment
      const limitCheck = await checkUserAssessmentLimits(user.id)
      if (!limitCheck.canTake) {
        toast({
          title: 'Assessment Limit Reached',
          description: limitCheck.reason,
          variant: 'destructive'
        })
        setCanTake(false)
        router.push('/assessments')
        return
      }

      // Get assessment
      const assessmentData = await getAssessmentById(params.id as string)
      
      if (!assessmentData) {
        toast({
          title: 'Error',
          description: 'Assessment not found',
          variant: 'destructive'
        })
        router.push('/assessments')
        return
      }

      setAssessment(assessmentData)
      
      // Parse questions from JSONB field
      if (assessmentData.questions && Array.isArray(assessmentData.questions)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setQuestions(assessmentData.questions.map((q: any, index: number) => ({
          id: `q${index}`,
          question: q.question || q,
          order: index
        })))
      }
    } catch (error) {
      console.error('Error fetching assessment:', error)
      toast({
        title: 'Error',
        description: 'Failed to load assessment',
        variant: 'destructive'
      })
      router.push('/assessments')
    } finally {
      setLoading(false)
    }
  }, [params.id, router, toast])

  useEffect(() => {
    fetchAssessment()
  }, [fetchAssessment])

  const startReading = () => {
    setStartTime(Date.now())
    setStage('reading')
  }

  const finishReading = () => {
    setEndTime(Date.now())
    setStage('questions')
  }

  const handleAnswerChange = (value: string) => {
    setUserAnswers({
      ...userAnswers,
      [currentQuestionIndex]: value
    })
  }

  const nextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    } else {
      submitAssessment()
    }
  }

  const previousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1)
    }
  }

  const submitAssessment = async () => {
    if (!assessment || !startTime || !endTime) return

    setSubmitting(true)
    try {
      const adminClient = createAdminClient()
      const { data: { user } } = await adminClient.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }

      // Calculate reading time and speed
      const readingTimeSeconds = Math.round((endTime - startTime) / 1000)
      const readingSpeed = Math.round((assessment.word_count || 0) / (readingTimeSeconds / 60))

      // Prepare answers object
      const answersObj: Record<string, string> = {}
      questions.forEach((q, index) => {
        answersObj[q.question] = userAnswers[index] || ''
      })

      // Submit assessment result
      const result = await submitAssessmentResult({
        assessmentId: assessment.id,
        userId: user.id,
        answers: answersObj,
        timeSpent: readingTimeSeconds,
        wpm: readingSpeed
      })

      if (!result) {
        throw new Error('Failed to submit assessment')
      }

      // Set results and show results stage
      setResults(result)
      setStage('results')

      toast({
        title: 'Assessment Completed',
        description: 'Your results have been saved successfully'
      })

    } catch (error) {
      console.error('Error submitting assessment:', error)
      toast({
        title: 'Error',
        description: 'Failed to save assessment results',
        variant: 'destructive'
      })
    } finally {
      setSubmitting(false)
    }
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'intermediate': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'advanced': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  // Removed unused formatTime function

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!assessment || !canTake) return null

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/assessments')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Assessments
        </Button>
        
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{assessment.title}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge className={getDifficultyColor(assessment.difficulty_level || 'intermediate')}>
              {assessment.difficulty_level || 'intermediate'}
            </Badge>
            {assessment.category && (
              <Badge variant="outline">{assessment.category}</Badge>
            )}
          </div>
        </div>
      </div>

      {/* Progress */}
      {stage !== 'intro' && stage !== 'results' && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">
                {stage === 'reading' ? 'Reading' : `Question ${currentQuestionIndex + 1} of ${questions.length}`}
              </span>
              <span className="text-sm text-muted-foreground">
                {stage === 'reading' ? 'Take your time' : `${Object.keys(userAnswers).length} answered`}
              </span>
            </div>
            <Progress 
              value={stage === 'reading' ? 50 : ((currentQuestionIndex + 1) / questions.length) * 100}
              className="h-2"
            />
          </CardContent>
        </Card>
      )}

      {/* Intro Stage */}
      {stage === 'intro' && (
        <Card>
          <CardHeader>
            <CardTitle>Assessment Instructions</CardTitle>
            <CardDescription>
              Please read the following instructions carefully before starting
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <BookOpen className="h-5 w-5 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Step 1: Read the Text</p>
                  <p className="text-sm text-muted-foreground">
                    You&apos;ll be presented with a text passage. Read it at your normal pace.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Step 2: Track Your Time</p>
                  <p className="text-sm text-muted-foreground">
                    Your reading time will be tracked to calculate your reading speed.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Step 3: Answer Questions</p>
                  <p className="text-sm text-muted-foreground">
                    After reading, answer comprehension questions about the text.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-muted rounded-lg p-4">
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1">
                  <BookOpen className="h-4 w-4" />
                  {assessment.word_count} words
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  ~{Math.ceil((assessment.word_count || 0) / 250)} min reading time
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" />
                  {questions.length} questions
                </span>
              </div>
            </div>

            <Button onClick={startReading} className="w-full" size="lg">
              <Play className="h-4 w-4 mr-2" />
              Start Reading
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Reading Stage */}
      {stage === 'reading' && (
        <Card>
          <CardHeader>
            <CardTitle>Read the Text</CardTitle>
            <CardDescription>
              Read at your normal pace. Click &quot;Finish Reading&quot; when done.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <div className="whitespace-pre-wrap text-base leading-relaxed">
                {assessment.content}
              </div>
            </div>
            
            <Button onClick={finishReading} className="w-full" size="lg">
              Finish Reading
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Questions Stage */}
      {stage === 'questions' && questions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Question {currentQuestionIndex + 1} of {questions.length}</CardTitle>
            <CardDescription>
              Answer based on what you read in the text
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <Label className="text-base">
                {questions[currentQuestionIndex].question}
              </Label>
              <Textarea
                placeholder="Type your answer here..."
                value={userAnswers[currentQuestionIndex] || ''}
                onChange={(e) => handleAnswerChange(e.target.value)}
                className="min-h-[120px]"
              />
            </div>

            <div className="flex justify-between">
              <Button 
                variant="outline" 
                onClick={previousQuestion}
                disabled={currentQuestionIndex === 0}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>
              
              <Button 
                onClick={nextQuestion}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : currentQuestionIndex === questions.length - 1 ? (
                  <>
                    Submit Assessment
                    <CheckCircle2 className="h-4 w-4 ml-2" />
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results Stage */}
      {stage === 'results' && results && (
        <div className="space-y-6">
          {/* Main Results Card */}
          <Card className="border-2 border-primary">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Trophy className="h-6 w-6 text-yellow-500" />
                Assessment Complete!
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Percentile Banner */}
              {results.comparisonPercentile && (
                <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-6 text-center">
                  <p className="text-3xl font-bold mb-2">
                    You read faster than {results.comparisonPercentile}% of users!
                  </p>
                  <p className="text-muted-foreground">
                    {results.attemptNumber > 1 && `Attempt #${results.attemptNumber}`}
                  </p>
                </div>
              )}

              {/* Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Reading Speed
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{results.wpm}</p>
                    <p className="text-sm text-muted-foreground">words per minute</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Comprehension
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{results.comprehensionPercentage}%</p>
                    <p className="text-sm text-muted-foreground">accuracy score</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      Performance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">
                      {results.percentile ? `Top ${100 - results.percentile}%` : 'N/A'}
                    </p>
                    <p className="text-sm text-muted-foreground">percentile rank</p>
                  </CardContent>
                </Card>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4">
                <Button 
                  onClick={() => router.push('/assessments')}
                  className="flex-1"
                >
                  Back to Assessments
                </Button>
                <Button 
                  onClick={() => window.location.reload()}
                  variant="outline"
                  className="flex-1"
                >
                  Retake Assessment
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Performance Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Performance Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                {results.wpm > 250 && (
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                    <p>Excellent reading speed! You read faster than the average reader.</p>
                  </div>
                )}
                {results.comprehensionPercentage >= 70 && (
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                    <p>Great comprehension! You understood the text well.</p>
                  </div>
                )}
                {results.wpm < 200 && (
                  <div className="flex items-start gap-2">
                    <TrendingUp className="h-4 w-4 text-yellow-500 mt-0.5" />
                    <p>Practice speed reading techniques to improve your reading pace.</p>
                  </div>
                )}
                {results.comprehensionPercentage < 50 && (
                  <div className="flex items-start gap-2">
                    <Target className="h-4 w-4 text-yellow-500 mt-0.5" />
                    <p>Focus on comprehension by reading more carefully next time.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}