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
  BarChart3
} from 'lucide-react'
import { AssessmentText } from '@/lib/types/database-extensions'

interface Question {
  question: string
}

interface UserAnswers {
  [key: number]: string
}

type AssessmentStage = 'intro' | 'reading' | 'questions' | 'results'

export default function AssessmentPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [assessment, setAssessment] = useState<AssessmentText | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [stage, setStage] = useState<AssessmentStage>('intro')
  const [startTime, setStartTime] = useState<number | null>(null)
  const [endTime, setEndTime] = useState<number | null>(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [userAnswers, setUserAnswers] = useState<UserAnswers>({})
  const [submitting, setSubmitting] = useState(false)
  const [results, setResults] = useState<{
    readingSpeed: number
    comprehensionScore: number
    readingTime: number
    correctAnswers: number
    totalQuestions: number
  } | null>(null)

  const fetchAssessment = useCallback(async () => {
    try {
      const adminClient = createAdminClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (adminClient as any)
        .from('assessment_texts')
        .select('*')
        .eq('id', params.id)
        .eq('active', true)
        .single()

      if (error) throw error
      if (!data) {
        toast({
          title: 'Error',
          description: 'Assessment not found',
          variant: 'destructive'
        })
        router.push('/assessments')
        return
      }

      setAssessment(data)
      
      // Parse questions from JSONB field
      if (data.questions && Array.isArray(data.questions)) {
        setQuestions(data.questions as Question[])
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
        router.push('/auth/login')
        return
      }

      // Calculate reading time and speed
      const readingTimeSeconds = Math.round((endTime - startTime) / 1000)
      const readingSpeed = Math.round((assessment.word_count || 0) / (readingTimeSeconds / 60))

      // Prepare answers for webhook
      const answersArray: Array<{
        question: string
        user_answer: string
      }> = questions.map((question, index) => ({
        question: question.question,
        user_answer: userAnswers[index] || ''
      }))

      // Call external webhook for scoring
      const comprehensionScore = await callExternalWebhook(
        assessment.content,
        answersArray
      )

      // Save results to database
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (adminClient as any)
        .from('assessment_results')
        .insert({
          user_id: user.id,
          assessment_id: assessment.id,
          wpm: readingSpeed,
          comprehension_percentage: comprehensionScore,
          time_taken: readingTimeSeconds,
          answers: answersArray
        })

      if (error) throw error

      // Set results and show results stage
      setResults({
        readingSpeed,
        comprehensionScore,
        readingTime: readingTimeSeconds,
        correctAnswers: 0, // Not applicable for text-based answers - score comes from webhook
        totalQuestions: questions.length
      })
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

  // External webhook function for assessment scoring
  const callExternalWebhook = async (text: string, answers: Array<{
    question: string
    user_answer: string
  }>): Promise<number> => {
    try {
      const response = await fetch('/api/assessments/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text,
          questions: answers.map(a => a.question),
          answers: answers.map(a => a.user_answer)
        })
      })

      if (!response.ok) {
        throw new Error('Webhook call failed')
      }

      const result = await response.json()
      const webhookScore = parseInt(result.result || "0")
      
      console.log('Webhook score:', webhookScore)
      
      // Return webhook score, or 0 if invalid
      return webhookScore > 0 ? webhookScore : 0
    } catch (error) {
      console.error('Webhook call error:', error)
      
      // Return 0 if webhook fails - no local fallback for text-based answers
      return 0
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

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!assessment) return null

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
              value={stage === 'reading' ? 50 : 50 + (currentQuestionIndex / questions.length) * 50} 
            />
          </CardContent>
        </Card>
      )}

      {/* Intro Stage */}
      {stage === 'intro' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-6 w-6" />
              Assessment Instructions
            </CardTitle>
            <CardDescription>
              Read the text carefully, then answer the comprehension questions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
              <div className="p-4 border rounded-lg">
                <BookOpen className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                <div className="font-medium">{assessment.word_count}</div>
                <div className="text-sm text-muted-foreground">words</div>
              </div>
              <div className="p-4 border rounded-lg">
                <Clock className="h-8 w-8 mx-auto mb-2 text-green-600" />
                <div className="font-medium">~{Math.ceil((assessment.word_count || 0) / 250)}</div>
                <div className="text-sm text-muted-foreground">min read</div>
              </div>
              <div className="p-4 border rounded-lg">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                <div className="font-medium">{questions.length}</div>
                <div className="text-sm text-muted-foreground">questions</div>
              </div>
            </div>

            <div className="bg-muted rounded-lg p-4">
              <h3 className="font-medium mb-2">How it works:</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                <li>Read the text at your normal pace</li>
                <li>Click &quot;Finish Reading&quot; when done</li>
                <li>Answer the comprehension questions</li>
                <li>Get your reading speed and comprehension score</li>
              </ol>
            </div>

            <Button onClick={startReading} className="w-full" size="lg">
              <Play className="h-4 w-4 mr-2" />
              Start Assessment
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Reading Stage */}
      {stage === 'reading' && (
        <Card>
          <CardHeader>
            <CardTitle>Read the following text</CardTitle>
            <CardDescription>
              Read at your normal pace. Click &quot;Finish Reading&quot; when you&apos;re done.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="prose max-w-none">
              <div className="text-base leading-relaxed whitespace-pre-wrap">
                {assessment.content}
              </div>
            </div>
            
            <div className="flex justify-center pt-6">
              <Button onClick={finishReading} size="lg">
                Finish Reading
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Questions Stage */}
      {stage === 'questions' && (
        <Card>
          <CardHeader>
            <CardTitle>Question {currentQuestionIndex + 1}</CardTitle>
            <CardDescription>
              Please provide a thoughtful written answer to the question below
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-lg font-medium">
              {questions[currentQuestionIndex]?.question}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="answer-input">Your Answer</Label>
              <Textarea
                id="answer-input"
                placeholder="Type your answer here..."
                value={userAnswers[currentQuestionIndex] || ''}
                onChange={(e) => handleAnswerChange(e.target.value)}
                rows={4}
                className="resize-none"
              />
              <p className="text-sm text-muted-foreground">
                Write a clear and complete answer. Your response will be evaluated by AI for comprehension.
              </p>
            </div>

            <div className="flex justify-between pt-4">
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
                disabled={!userAnswers[currentQuestionIndex]?.trim() || submitting}
              >
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {currentQuestionIndex === questions.length - 1 ? 'Submit' : 'Next'}
                {currentQuestionIndex < questions.length - 1 && <ArrowRight className="h-4 w-4 ml-2" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results Stage */}
      {stage === 'results' && results && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
              Assessment Complete!
            </CardTitle>
            <CardDescription>
              Here are your results for this assessment
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 border rounded-lg text-center">
                <BarChart3 className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                <div className="text-2xl font-bold">{results.readingSpeed}</div>
                <div className="text-sm text-muted-foreground">WPM</div>
              </div>
              
              <div className="p-4 border rounded-lg text-center">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-600" />
                <div className="text-2xl font-bold">{results.comprehensionScore}%</div>
                <div className="text-sm text-muted-foreground">comprehension</div>
              </div>
              
              <div className="p-4 border rounded-lg text-center">
                <Clock className="h-8 w-8 mx-auto mb-2 text-orange-600" />
                <div className="text-2xl font-bold">{formatTime(results.readingTime)}</div>
                <div className="text-sm text-muted-foreground">reading time</div>
              </div>
              
              <div className="p-4 border rounded-lg text-center">
                <BookOpen className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                <div className="text-2xl font-bold">{results.correctAnswers}/{results.totalQuestions}</div>
                <div className="text-sm text-muted-foreground">correct</div>
              </div>
            </div>

            <div className="flex gap-4">
              <Button variant="outline" onClick={() => router.push('/assessments')} className="flex-1">
                Back to Assessments
              </Button>
              <Button 
                onClick={() => {
                  // Reset assessment for retake
                  setStage('intro')
                  setStartTime(null)
                  setEndTime(null)
                  setCurrentQuestionIndex(0)
                  setUserAnswers({})
                  setResults(null)
                }} 
                className="flex-1"
              >
                Take Again
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}