'use client'

import { useState, useEffect, useCallback } from 'react'
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
  Target
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

export default function QuestionsPage() {
  const [currentAssessment, setCurrentAssessment] = useState<AssessmentText | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [userAnswers, setUserAnswers] = useState<string[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [showResults, setShowResults] = useState(false)
  const [score, setScore] = useState(0)
  const [readingTime, setReadingTime] = useState(0)
  const [wpm, setWpm] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const supabase = createAdminClient()
  const { toast } = useToast()

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

      // Get a random active assessment that user hasn't done recently
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

      // Select random assessment
      const randomAssessment = assessments[Math.floor(Math.random() * assessments.length)]
      setCurrentAssessment(randomAssessment)

      // Parse questions from the assessment
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

    // Calculate WPM (would need actual reading time tracking)
    const wordCount = currentAssessment.word_count || 0
    const estimatedReadingTime = 0 // Would need actual reading time measurement
    const calculatedWpm = estimatedReadingTime > 0 ? Math.round(wordCount / estimatedReadingTime) : 0
    setWpm(calculatedWpm)
    setReadingTime(estimatedReadingTime)

    setSubmitting(true)
    try {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) throw new Error('User not authenticated')

      // Save assessment result
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('assessment_results')
        .insert({
          user_id: user.user.id,
          assessment_id: currentAssessment.id,
          wpm: calculatedWpm,
          comprehension_percentage: comprehensionPercentage,
          time_taken: estimatedReadingTime * 60, // convert to seconds
          answers: userAnswers,
          percentile: null // This would be calculated by backend
        })

      if (error) throw error

      console.log('Webhook result:', webhookResult)

      setShowResults(true)
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

  // Call external webhook through our API
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

  const currentQuestion = questions[currentQuestionIndex]
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100

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

  if (showResults) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <Trophy className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <CardTitle className="text-2xl">Assessment Complete!</CardTitle>
            <CardDescription>
              Here are your reading comprehension results
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
                <div className="text-2xl font-bold">{readingTime}m</div>
                <div className="text-sm text-muted-foreground">Reading time</div>
              </div>
            </div>

            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">Performance Summary</h3>
              <p className="text-muted-foreground mb-4">
                You received a comprehension score of {score}% based on AI evaluation of your {questions.length} text responses.
                {score >= 80 && " Excellent comprehension!"}
                {score >= 60 && score < 80 && " Good comprehension with room for improvement."}
                {score < 60 && " Consider practicing reading comprehension exercises."}
              </p>
              
              <div className="flex gap-4 justify-center">
                <Button onClick={() => window.location.reload()}>
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

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  {currentAssessment.title || 'Reading Assessment'}
                </CardTitle>
                <CardDescription>
                  Question {currentQuestionIndex + 1} of {questions.length}
                </CardDescription>
              </div>
              <Badge variant="outline">
                {currentAssessment.difficulty_level || 'intermediate'}
              </Badge>
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
              <Label htmlFor="question-answer">Your Answer</Label>
              <Textarea
                id="question-answer"
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
                  className="min-w-[100px]"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Submitting
                    </>
                  ) : (
                    <>
                      Submit
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