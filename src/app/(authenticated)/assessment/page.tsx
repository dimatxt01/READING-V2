'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/components/ui/use-toast'
import { createAdminClient } from '@/lib/supabase/admin-client'
import {
  CheckCircle2,
  Clock,
  BookOpen,
  Brain,
  Loader2,
  ArrowRight,
  Trophy,
  Target,
  Play,
  Pause,
  RotateCcw
} from 'lucide-react'
import { AssessmentText } from '@/lib/types/database-extensions'

interface Question {
  question: string
}

interface QuestionnaireData {
  text: string
  questions: string[]
  answers: string[]
}

type AssessmentPhase = 'intro' | 'reading' | 'questions' | 'results'

export default function AssessmentPage() {
  const [currentAssessment, setCurrentAssessment] = useState<AssessmentText | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [userAnswers, setUserAnswers] = useState<string[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [phase, setPhase] = useState<AssessmentPhase>('intro')
  const [score, setScore] = useState(0)
  const [readingTime, setReadingTime] = useState(0)
  const [wpm, setWpm] = useState(0)
  const [isReading, setIsReading] = useState(false)
  const [startTime, setStartTime] = useState<Date | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [webhookResult, setWebhookResult] = useState<string>('')
  const supabase = createAdminClient()
  const { toast } = useToast()
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const fetchRandomAssessment = useCallback(async () => {
    try {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) {
        toast({
          title: 'Error',
          description: 'Please sign in to access assessments',
          variant: 'destructive'
        })
        return
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: assessments, error } = await (supabase as any)
        .from('assessment_texts')
        .select('*')
        .eq('active', true)
        .limit(10)

      if (error) throw error

      if (!assessments || assessments.length === 0) {
        toast({
          title: 'No assessments available',
          description: 'Please check back later for new reading assessments',
          variant: 'destructive'
        })
        return
      }

      const randomAssessment = assessments[Math.floor(Math.random() * assessments.length)]
      setCurrentAssessment(randomAssessment)

      const questionsData = Array.isArray(randomAssessment.questions) 
        ? randomAssessment.questions as Question[]
        : []
      
      setQuestions(questionsData)
      setUserAnswers(new Array(questionsData.length).fill(''))
      
    } catch (error) {
      console.error('Error fetching assessment:', error)
      toast({
        title: 'Error',
        description: 'Failed to load assessment',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [supabase, toast])

  useEffect(() => {
    fetchRandomAssessment()
  }, [fetchRandomAssessment])

  useEffect(() => {
    if (isReading && startTime) {
      timerRef.current = setInterval(() => {
        setReadingTime(Math.floor((new Date().getTime() - startTime.getTime()) / 1000))
      }, 1000)
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [isReading, startTime])

  const startReading = () => {
    setPhase('reading')
    setIsReading(true)
    setStartTime(new Date())
  }

  const pauseReading = () => {
    setIsReading(false)
  }

  const resumeReading = () => {
    setIsReading(true)
    // Adjust start time to account for pause
    if (startTime) {
      const pausedTime = readingTime
      setStartTime(new Date(new Date().getTime() - pausedTime * 1000))
    }
  }

  const finishReading = () => {
    setIsReading(false)
    if (timerRef.current) {
      clearInterval(timerRef.current)
    }
    
    // Calculate WPM
    const wordCount = currentAssessment?.word_count || 0
    const timeInMinutes = readingTime / 60
    const calculatedWpm = timeInMinutes > 0 ? Math.round(wordCount / timeInMinutes) : 0
    setWpm(calculatedWpm)
    
    setPhase('questions')
  }

  const handleAnswerChange = (value: string) => {
    const newAnswers = [...userAnswers]
    newAnswers[currentQuestionIndex] = value
    setUserAnswers(newAnswers)
  }

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    }
  }

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1)
    }
  }

  const handleSubmit = async () => {
    if (!currentAssessment) return

    // Get score from external webhook
    const questionTexts = questions.map(q => q.question)
    const webhookResult = await callAssessmentWebhook({
      text: currentAssessment.content,
      questions: questionTexts,
      answers: userAnswers
    })
    
    const comprehensionPercentage = parseInt(webhookResult) || 0
    setScore(comprehensionPercentage)

    setSubmitting(true)
    try {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) throw new Error('User not authenticated')

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('assessment_results')
        .insert({
          user_id: user.user.id,
          assessment_id: currentAssessment.id,
          wpm: wpm,
          comprehension_percentage: comprehensionPercentage,
          time_taken: readingTime,
          answers: userAnswers,
          percentile: null
        })

      if (error) throw error

      // Call external webhook
      const result = await callAssessmentWebhook({
        text: currentAssessment.content,
        questions: questions.map(q => q.question),
        answers: userAnswers
      })
      
      setWebhookResult(result)
      setPhase('results')
      
      toast({
        title: 'Assessment completed!',
        description: 'Your results have been saved successfully'
      })

    } catch (error) {
      console.error('Error submitting assessment:', error)
      toast({
        title: 'Error',
        description: 'Failed to submit assessment results',
        variant: 'destructive'
      })
    } finally {
      setSubmitting(false)
    }
  }

  const callAssessmentWebhook = async (data: QuestionnaireData) => {
    try {
      const response = await fetch('/api/assessments/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        throw new Error('Webhook call failed')
      }

      const result = await response.json()
      return result.result || "0"
    } catch (error) {
      console.error('Webhook call error:', error)
      return "0"
    }
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const currentQuestion = questions[currentQuestionIndex]
  const progress = questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading assessment...</p>
        </div>
      </div>
    )
  }

  if (!currentAssessment || questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">No Assessment Available</h2>
            <p className="text-muted-foreground mb-4">
              There are no active assessments available at the moment.
            </p>
            <Button onClick={fetchRandomAssessment}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Introduction Phase
  if (phase === 'intro') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <BookOpen className="h-12 w-12 text-blue-500 mx-auto mb-4" />
            <CardTitle className="text-2xl">Reading Speed Assessment</CardTitle>
            <CardDescription>
              Test your reading speed and comprehension
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h3 className="font-semibold">{currentAssessment.title || 'Reading Assessment'}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline">
                    {currentAssessment.difficulty_level || 'intermediate'}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {currentAssessment.word_count || 0} words
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {questions.length} questions
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium">Instructions:</h4>
              <ul className="space-y-2 text-sm text-muted-foreground list-disc list-inside">
                <li>Read the text at your normal pace</li>
                <li>Click &quot;Start Reading&quot; when you&apos;re ready to begin</li>
                <li>Click &quot;Finished Reading&quot; when you complete the text</li>
                <li>Answer the comprehension questions that follow</li>
                <li>Try to maintain good comprehension while reading naturally</li>
              </ul>
            </div>

            <Button onClick={startReading} className="w-full" size="lg">
              <Play className="h-4 w-4 mr-2" />
              Start Reading Assessment
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Reading Phase
  if (phase === 'reading') {
    return (
      <div className="min-h-screen p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Timer Header */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    <span className="text-xl font-mono">{formatTime(readingTime)}</span>
                  </div>
                  <Badge variant={isReading ? "default" : "secondary"}>
                    {isReading ? "Reading" : "Paused"}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  {isReading ? (
                    <Button onClick={pauseReading} variant="outline" size="sm">
                      <Pause className="h-4 w-4 mr-2" />
                      Pause
                    </Button>
                  ) : (
                    <Button onClick={resumeReading} variant="outline" size="sm">
                      <Play className="h-4 w-4 mr-2" />
                      Resume
                    </Button>
                  )}
                  <Button onClick={finishReading} variant="default">
                    Finished Reading
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Reading Text */}
          <Card>
            <CardHeader>
              <CardTitle>{currentAssessment.title || 'Reading Assessment'}</CardTitle>
              <CardDescription>
                Read the following text at your normal pace. Focus on understanding the content.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none leading-relaxed">
                <p className="whitespace-pre-wrap text-base leading-7">
                  {currentAssessment.content}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Questions Phase
  if (phase === 'questions') {
    return (
      <div className="min-h-screen p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    Comprehension Questions
                  </CardTitle>
                  <CardDescription>
                    Question {currentQuestionIndex + 1} of {questions.length}
                  </CardDescription>
                </div>
                <div className="text-sm text-muted-foreground">
                  Reading time: {formatTime(readingTime)} | {wpm} WPM
                </div>
              </div>
              <Progress value={progress} className="w-full" />
            </CardHeader>
          </Card>

          {/* Question Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {currentQuestion.question}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Label htmlFor="answer-textarea">Your Answer</Label>
                <Textarea
                  id="answer-textarea"
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
            </CardContent>
          </Card>

          {/* Navigation */}
          <Card>
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={currentQuestionIndex === 0}
                >
                  Previous
                </Button>

                <div className="text-sm text-muted-foreground">
                  {userAnswers.filter(answer => answer !== '').length} of {questions.length} answered
                </div>

                {currentQuestionIndex === questions.length - 1 ? (
                  <Button
                    onClick={handleSubmit}
                    disabled={userAnswers.some(answer => answer === '') || submitting}
                    className="min-w-[120px]"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Submitting
                      </>
                    ) : (
                      <>
                        Submit Assessment
                        <CheckCircle2 className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    onClick={handleNext}
                    disabled={!userAnswers[currentQuestionIndex]?.trim()}
                  >
                    Next
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Results Phase
  if (phase === 'results') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <Trophy className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <CardTitle className="text-2xl">Assessment Complete!</CardTitle>
            <CardDescription>
              Here are your reading speed and comprehension results
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 border rounded-lg">
                <Target className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                <div className="text-2xl font-bold">{score.toFixed(0)}%</div>
                <div className="text-sm text-muted-foreground">Comprehension</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <Clock className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <div className="text-2xl font-bold">{wpm}</div>
                <div className="text-sm text-muted-foreground">Words per minute</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <Brain className="h-8 w-8 text-purple-500 mx-auto mb-2" />
                <div className="text-2xl font-bold">{formatTime(readingTime)}</div>
                <div className="text-sm text-muted-foreground">Reading time</div>
              </div>
            </div>

            {webhookResult && (
              <div className="text-center p-4 border rounded-lg bg-muted/50">
                <h3 className="font-semibold mb-2">External Analysis Score</h3>
                <div className="text-3xl font-bold text-primary">{webhookResult}</div>
                <div className="text-sm text-muted-foreground">AI-powered assessment result</div>
              </div>
            )}

            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">Performance Summary</h3>
              <p className="text-muted-foreground mb-4">
                You answered {Math.round((score / 100) * questions.length)} out of {questions.length} questions correctly 
                with a reading speed of {wpm} words per minute.
                {score >= 80 && " Excellent comprehension!"}
                {score >= 60 && score < 80 && " Good comprehension with room for improvement."}
                {score < 60 && " Consider practicing reading comprehension exercises."}
              </p>
              
              <div className="flex gap-4 justify-center">
                <Button onClick={() => window.location.reload()}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Take Another Assessment
                </Button>
                <Button variant="outline" onClick={() => window.location.href = '/dashboard'}>
                  Go to Dashboard
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return null
}