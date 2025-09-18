'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, BookOpen, Check, Star, Target, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import { ExerciseService } from '@/lib/services/exercises'
import { Exercise } from '@/lib/types/exercises'

const MINDSET_CONTENT = {
  title: "The Most Important Principle: Just Read More",
  sections: [
    {
      title: "Introduction",
      content: "This isn't an exercise; it's the foundation of all reading improvement. The most scientifically-backed way to boost your reading speed, comprehension, and memory is simple: read consistently.",
      icon: BookOpen
    },
    {
      title: "1. You Get Faster, Automatically",
      content: "The more you see a word, the faster your brain recognizes it. This process, called automaticity, becomes effortless. It frees up your mental energy to focus on understanding big ideas instead of just decoding individual words.",
      icon: TrendingUp
    },
    {
      title: "2. You Understand More, Effortlessly", 
      content: "Reading is the best way to grow your vocabulary, and a larger vocabulary is directly linked to better comprehension. You also build a library of background knowledge in your mind, which helps you grasp new topics much faster.",
      icon: Target
    },
    {
      title: "3. You Remember Better, Scientifically",
      content: "Consistent reading physically changes your brain. This process, known as neuroplasticity, strengthens the neural pathways for language and memory. The more you read, the more efficient your brain becomes at storing what you've learned.",
      icon: Star
    }
  ],
  takeaway: {
    title: "The Takeaway",
    content: "The exercises in this app are powerful tools. But they are most effective when combined with the fundamental habit of consistent reading. Submit your pages daily to build the most important skill of all."
  }
}

const READING_TIPS = [
  "Set a daily reading goal (even 20 minutes makes a difference)",
  "Read a variety of genres to expand your vocabulary", 
  "Keep a reading journal to track your progress",
  "Choose books slightly above your current level",
  "Read actively by asking questions about the content",
  "Join reading communities for motivation and discussion"
]

export default function MindsetPage() {
  const [exercise, setExercise] = useState<Exercise | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentSection, setCurrentSection] = useState(0)
  const [completedSections, setCompletedSections] = useState<Set<number>>(new Set())
  const [showTakeaway, setShowTakeaway] = useState(false)
  const [readingTime, setReadingTime] = useState(0)

  // Load exercise data
  useEffect(() => {
    async function loadExercise() {
      try {
        setLoading(true)
        const exercises = await ExerciseService.getExercisesByType('mindset')
        if (exercises.length > 0) {
          setExercise(exercises[0])
        } else {
          setError('Mindset exercise not found')
        }
      } catch (err) {
        setError('Failed to load exercise')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    loadExercise()
  }, [])

  // Reading time tracker
  useEffect(() => {
    const timer = setInterval(() => {
      setReadingTime(prev => prev + 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const markSectionComplete = (sectionIndex: number) => {
    setCompletedSections(prev => new Set([...prev, sectionIndex]))
    
    // Auto-advance to next section or takeaway
    if (sectionIndex < MINDSET_CONTENT.sections.length - 1) {
      setTimeout(() => {
        setCurrentSection(sectionIndex + 1)
      }, 1000)
    } else {
      setTimeout(() => {
        setShowTakeaway(true)
      }, 1000)
    }
  }

  const completeExercise = async () => {
    if (exercise) {
      try {
        await ExerciseService.submitExerciseResult({
          exerciseId: exercise.id,
          results: {
            score: 100, // Mindset exercises are completion-based
            accuracy: 100,
            timeSpent: readingTime,
            totalAttempts: 1,
            correctCount: 1,
            details: {
              sectionsCompleted: completedSections.size,
              totalSections: MINDSET_CONTENT.sections.length,
              timeSpent: readingTime
            }
          },
          settings: {}
        })
      } catch (err) {
        console.error('Failed to submit results:', err)
      }
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getProgressPercentage = () => {
    const totalSteps = MINDSET_CONTENT.sections.length + 1 // +1 for takeaway
    let completed = completedSections.size
    if (showTakeaway) completed += 1
    return (completed / totalSteps) * 100
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-red-600 mb-4">{error}</p>
              <Button asChild>
                <Link href="/exercises">Back to Exercises</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button asChild variant="ghost" size="sm">
          <Link href="/exercises">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{exercise?.title || 'Mindset Exercise'}</h1>
          <p className="text-muted-foreground">
            Understanding the foundation of reading improvement
          </p>
        </div>
        <div className="text-right">
          <div className="text-sm text-muted-foreground">Reading Time</div>
          <div className="text-lg font-medium">{formatTime(readingTime)}</div>
        </div>
      </div>

      {/* Progress Bar */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Progress</span>
            <span className="text-sm text-muted-foreground">
              {completedSections.size + (showTakeaway ? 1 : 0)} / {MINDSET_CONTENT.sections.length + 1}
            </span>
          </div>
          <Progress value={getProgressPercentage()} className="h-2" />
        </CardContent>
      </Card>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Content Area */}
        <div className="lg:col-span-2 space-y-6">
          {/* Title Card */}
          <Card className="border-2 border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-2xl text-blue-900">
                {MINDSET_CONTENT.title}
              </CardTitle>
            </CardHeader>
          </Card>

          {/* Sections */}
          {MINDSET_CONTENT.sections.map((section, index) => {
            const Icon = section.icon
            const isCompleted = completedSections.has(index)
            const isCurrent = currentSection === index
            const isAccessible = index <= currentSection

            return (
              <Card 
                key={index} 
                className={`transition-all ${
                  isCompleted 
                    ? 'border-green-200 bg-green-50' 
                    : isCurrent 
                    ? 'border-blue-200 bg-blue-50 shadow-md' 
                    : !isAccessible
                    ? 'opacity-60'
                    : ''
                }`}
              >
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${
                      isCompleted 
                        ? 'bg-green-500 text-white' 
                        : isCurrent 
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-500'
                    }`}>
                      {isCompleted ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                    </div>
                    <CardTitle className={isCompleted ? 'text-green-800' : isCurrent ? 'text-blue-800' : ''}>
                      {section.title}
                    </CardTitle>
                  </div>
                </CardHeader>
                {isAccessible && (
                  <CardContent>
                    <p className="text-gray-700 leading-relaxed mb-4">
                      {section.content}
                    </p>
                    {isCurrent && !isCompleted && (
                      <Button 
                        onClick={() => markSectionComplete(index)}
                        className="mt-2"
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Mark as Read
                      </Button>
                    )}
                  </CardContent>
                )}
              </Card>
            )
          })}

          {/* Takeaway Section */}
          {showTakeaway && (
            <Card className="border-2 border-purple-200 bg-purple-50">
              <CardHeader>
                <CardTitle className="text-xl text-purple-900 flex items-center gap-2">
                  <Star className="h-6 w-6" />
                  {MINDSET_CONTENT.takeaway.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-purple-800 leading-relaxed text-lg mb-6">
                  {MINDSET_CONTENT.takeaway.content}
                </p>
                <Button 
                  onClick={completeExercise}
                  size="lg" 
                  className="w-full"
                >
                  <Check className="h-5 w-5 mr-2" />
                  Complete Exercise
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Section Navigator */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Sections</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {MINDSET_CONTENT.sections.map((section, index) => {
                const isCompleted = completedSections.has(index)
                const isCurrent = currentSection === index
                
                return (
                  <div 
                    key={index}
                    className={`flex items-center gap-3 p-2 rounded-lg ${
                      isCompleted 
                        ? 'bg-green-100 text-green-800' 
                        : isCurrent 
                        ? 'bg-blue-100 text-blue-800'
                        : 'text-gray-600'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                      isCompleted 
                        ? 'bg-green-500 text-white' 
                        : isCurrent 
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200'
                    }`}>
                      {isCompleted ? '✓' : index + 1}
                    </div>
                    <span className="text-sm font-medium truncate">
                      {section.title}
                    </span>
                  </div>
                )
              })}
            </CardContent>
          </Card>

          {/* Reading Tips */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Daily Reading Tips</CardTitle>
              <CardDescription>
                Apply these principles to maximize your improvement
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {READING_TIPS.map((tip, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <Badge variant="outline" className="mt-0.5 text-xs">
                      {index + 1}
                    </Badge>
                    <p className="text-sm text-gray-700">{tip}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Action Card */}
          <Card className="border-yellow-200 bg-yellow-50">
            <CardHeader>
              <CardTitle className="text-lg text-yellow-900">Take Action</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-yellow-800 mb-4">
                Ready to start building your reading habit?
              </p>
              <Button asChild variant="outline" className="w-full">
                <Link href="/submit">
                  Submit Today&apos;s Pages
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}