'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, Play, Pause, RotateCcw, Settings, Clock, Target, Zap } from 'lucide-react'
import Link from 'next/link'
import { ExerciseService } from '@/lib/services/exercises'
import { Exercise, ExerciseSessionResult } from '@/lib/types/exercises'

interface ThreeTwoOneState {
  mode: 'setup' | 'round1' | 'round2' | 'round3' | 'paused' | 'results'
  currentRound: number
  text: string
  useCustomText: boolean
  customText: string
  startTime: Date | null
  endTime: Date | null
  roundResults: Array<{
    roundName: string
    duration: number
    wordsRead: number
    readingSpeed: number
    completed: boolean
  }>
  pacer: {
    position: number
    isRunning: boolean
    speed: number
  }
}

interface RoundConfig {
  name: string
  duration: number
  multiplier: number
  color: string
  icon: React.ComponentType<any> // eslint-disable-line @typescript-eslint/no-explicit-any
}

const ROUND_CONFIGS: RoundConfig[] = [
  { name: 'Normal', duration: 180, multiplier: 1.0, color: 'bg-blue-500', icon: Clock },
  { name: 'Faster', duration: 120, multiplier: 1.5, color: 'bg-orange-500', icon: Target },
  { name: 'Sprint', duration: 60, multiplier: 2.0, color: 'bg-red-500', icon: Zap }
]

const DEFAULT_TEXT = `The rapid advancement of technology has fundamentally changed how we communicate, work, and live. Social media platforms connect billions of people worldwide, enabling instant communication across vast distances. However, this connectivity comes with challenges including privacy concerns, misinformation, and digital addiction.

As we navigate this digital landscape, we must balance the benefits of technological progress with the need to preserve human connection and mental well-being. Artificial intelligence is becoming increasingly sophisticated, capable of performing tasks that once required human intelligence. Machine learning algorithms can now recognize patterns, make predictions, and even create content.

The future will likely bring even more dramatic changes as these technologies become more prevalent in our daily lives. Virtual and augmented reality are creating new forms of entertainment and education. Blockchain technology is revolutionizing how we think about trust and verification in digital transactions.

Despite these advances, it's important to remember that technology should serve humanity, not the other way around. We must ensure that as we embrace these innovations, we don't lose sight of what makes us fundamentally human: our capacity for empathy, creativity, and meaningful connection with one another.

The key to thriving in this technological age is to remain adaptable while staying grounded in our core values. By doing so, we can harness the power of technology to create a better world for everyone.`

export default function ThreeTwoOnePage() {
  const [exercise, setExercise] = useState<Exercise | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [state, setState] = useState<ThreeTwoOneState>({
    mode: 'setup',
    currentRound: 0,
    text: DEFAULT_TEXT,
    useCustomText: false,
    customText: '',
    startTime: null,
    endTime: null,
    roundResults: [],
    pacer: {
      position: 0,
      isRunning: false,
      speed: 1
    }
  })

  const [timeLeft, setTimeLeft] = useState(0)
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null)

  // Load exercise data
  useEffect(() => {
    async function loadExercise() {
      try {
        setLoading(true)
        const exercises = await ExerciseService.getExercisesByType('three_two_one')
        if (exercises.length > 0) {
          setExercise(exercises[0])
        } else {
          setError('3-2-1 Speed Reading exercise not found')
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

  const getWordCount = useCallback(() => {
    const text = state.useCustomText ? state.customText : state.text
    return text.trim().split(/\s+/).length
  }, [state.text, state.customText, state.useCustomText])

  const finishExercise = useCallback(async () => {
    const endTime = new Date()
    const totalTime = state.startTime ? (endTime.getTime() - state.startTime.getTime()) / 1000 : 0
    const avgSpeed = Math.round(
      state.roundResults.reduce((sum, result) => sum + result.readingSpeed, 0) / state.roundResults.length
    )

    setState(prev => ({
      ...prev,
      mode: 'results',
      endTime
    }))

    // Submit results to database
    if (exercise) {
      try {
        const results: ExerciseSessionResult = {
          score: avgSpeed, // Use average speed as score
          accuracy: 100, // 3-2-1 doesn't test accuracy
          wordsPerMinute: avgSpeed,
          timeSpent: totalTime,
          totalAttempts: state.roundResults.length,
          correctCount: state.roundResults.length,
          details: {
            roundResults: state.roundResults
          }
        }

        await ExerciseService.submitExerciseResult({
          exerciseId: exercise.id,
          results,
          settings: {
            useCustomText: state.useCustomText,
            customText: state.useCustomText ? state.customText : undefined
          }
        })
      } catch (err) {
        console.error('Failed to submit results:', err)
      }
    }
  }, [state.startTime, state.roundResults, state.useCustomText, state.customText, exercise])

  const completeRound = useCallback(() => {
    const roundConfig = ROUND_CONFIGS[state.currentRound]
    const wordsRead = getWordCount()
    const readingSpeed = Math.round((wordsRead / roundConfig.duration) * 60 * roundConfig.multiplier)

    const newRoundResult = {
      roundName: roundConfig.name,
      duration: roundConfig.duration,
      wordsRead,
      readingSpeed,
      completed: true
    }

    setState(prev => ({
      ...prev,
      roundResults: [...prev.roundResults, newRoundResult],
      pacer: { ...prev.pacer, isRunning: false }
    }))

    // Check if this was the last round
    if (state.currentRound === ROUND_CONFIGS.length - 1) {
      finishExercise()
    } else {
      // Wait 3 seconds before showing next round
      setTimeout(() => {
        setState(prev => ({ ...prev, mode: 'setup' }))
      }, 3000)
    }
  }, [state.currentRound, getWordCount, finishExercise])

  // Timer effect
  useEffect(() => {
    if (state.mode.startsWith('round') && state.pacer.isRunning) {
      const id = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            completeRound()
            return 0
          }
          return prev - 1
        })
      }, 1000)
      setIntervalId(id)
      return () => clearInterval(id)
    } else if (intervalId) {
      clearInterval(intervalId)
      setIntervalId(null)
    }
  }, [state.mode, state.pacer.isRunning, completeRound, intervalId])

  // Pacer effect
  useEffect(() => {
    if (state.pacer.isRunning && state.mode.startsWith('round')) {
      const currentRoundConfig = ROUND_CONFIGS[state.currentRound]
      const wordsPerSecond = (getWordCount() / currentRoundConfig.duration) * currentRoundConfig.multiplier
      
      const pacerInterval = setInterval(() => {
        setState(prev => ({
          ...prev,
          pacer: {
            ...prev.pacer,
            position: Math.min(
              prev.pacer.position + (wordsPerSecond / 10), // Update 10 times per second
              getWordCount()
            )
          }
        }))
      }, 100)

      return () => clearInterval(pacerInterval)
    }
  }, [state.pacer.isRunning, state.mode, state.currentRound, getWordCount])

  const getReadingText = () => {
    return state.useCustomText ? state.customText : state.text
  }

  const startRound = (roundIndex: number) => {
    const roundConfig = ROUND_CONFIGS[roundIndex]
    setState(prev => ({
      ...prev,
      mode: `round${roundIndex + 1}` as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      currentRound: roundIndex,
      startTime: new Date(),
      pacer: {
        position: 0,
        isRunning: true,
        speed: roundConfig.multiplier
      }
    }))
    setTimeLeft(roundConfig.duration)
  }

  const pauseRound = () => {
    setState(prev => ({
      ...prev,
      mode: 'paused',
      pacer: { ...prev.pacer, isRunning: false }
    }))
  }

  const resumeRound = () => {
    setState(prev => ({
      ...prev,
      mode: `round${prev.currentRound + 1}` as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      pacer: { ...prev.pacer, isRunning: true }
    }))
  }



  const resetExercise = () => {
    setState({
      mode: 'setup',
      currentRound: 0,
      text: DEFAULT_TEXT,
      useCustomText: false,
      customText: '',
      startTime: null,
      endTime: null,
      roundResults: [],
      pacer: {
        position: 0,
        isRunning: false,
        speed: 1
      }
    })
    setTimeLeft(0)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getHighlightedText = () => {
    const text = getReadingText()
    const words = text.split(' ')
    const currentWordIndex = Math.floor(state.pacer.position)
    
    return words.map((word, index) => (
      <span
        key={index}
        className={`${
          index < currentWordIndex
            ? 'text-green-600 bg-green-100'
            : index === currentWordIndex
            ? 'text-blue-600 bg-blue-200 font-semibold'
            : 'text-gray-700'
        } transition-colors duration-200`}
      >
        {word}{' '}
      </span>
    ))
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
        <div>
          <h1 className="text-2xl font-bold">{exercise?.title || '3-2-1 Speed Reading'}</h1>
          <p className="text-muted-foreground">
            Read the same text three times at increasing speeds to improve your reading rate
          </p>
        </div>
      </div>

      {/* Setup Mode */}
      {state.mode === 'setup' && (
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Exercise Setup
              </CardTitle>
              <CardDescription>
                Choose your reading text and prepare for three progressive rounds
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={state.useCustomText ? 'custom' : 'default'} onValueChange={(value) => 
                setState(prev => ({ ...prev, useCustomText: value === 'custom' }))
              }>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="default">Default Text</TabsTrigger>
                  <TabsTrigger value="custom">Custom Text</TabsTrigger>
                </TabsList>
                
                <TabsContent value="default" className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm font-medium mb-2">Sample: Technology and Society</p>
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {DEFAULT_TEXT}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Words: {DEFAULT_TEXT.trim().split(/\s+/).length}
                    </p>
                  </div>
                </TabsContent>
                
                <TabsContent value="custom" className="space-y-4">
                  <div>
                    <Label htmlFor="custom-text">Your Custom Text</Label>
                    <Textarea
                      id="custom-text"
                      placeholder="Paste your text here (200-2000 words recommended)..."
                      value={state.customText}
                      onChange={(e) => setState(prev => ({ ...prev, customText: e.target.value }))}
                      className="min-h-[200px] mt-2"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Words: {state.customText.trim().split(/\s+/).length}
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Round Instructions */}
          <Card>
            <CardHeader>
              <CardTitle>Round Instructions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                {ROUND_CONFIGS.map((round, index) => {
                  const Icon = round.icon
                  const isCompleted = state.roundResults.some(r => r.roundName === round.name)
                  const isNext = state.roundResults.length === index
                  
                  return (
                    <div
                      key={round.name}
                      className={`p-4 border rounded-lg ${
                        isCompleted
                          ? 'border-green-200 bg-green-50'
                          : isNext
                          ? 'border-blue-200 bg-blue-50'
                          : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`p-2 rounded-full text-white ${round.color}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <h3 className="font-medium">{round.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {formatTime(round.duration)}
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Target: {round.multiplier}x normal speed
                      </p>
                      {isCompleted && (
                        <div className="mt-2 text-xs text-green-600 font-medium">
                          ✓ Completed
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              <div className="mt-6 text-center">
                <Button
                  onClick={() => startRound(state.roundResults.length)}
                  size="lg"
                  disabled={state.useCustomText && state.customText.length < 50}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Start {ROUND_CONFIGS[state.roundResults.length]?.name || 'Next'} Round
                </Button>
                {state.useCustomText && state.customText.length < 50 && (
                  <p className="text-sm text-red-600 mt-2">
                    Custom text must be at least 50 words
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Reading Mode */}
      {state.mode.startsWith('round') && (
        <Card className="min-h-[600px]">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-full text-white ${ROUND_CONFIGS[state.currentRound].color}`}>
                  {React.createElement(ROUND_CONFIGS[state.currentRound].icon, { className: "h-5 w-5" })}
                </div>
                <div>
                  <CardTitle>Round {state.currentRound + 1}: {ROUND_CONFIGS[state.currentRound].name}</CardTitle>
                  <CardDescription>
                    Target Speed: {ROUND_CONFIGS[state.currentRound].multiplier}x normal
                  </CardDescription>
                </div>
              </div>
              <div className="text-2xl font-bold">
                {formatTime(timeLeft)}
              </div>
            </div>
            <Progress 
              value={((ROUND_CONFIGS[state.currentRound].duration - timeLeft) / ROUND_CONFIGS[state.currentRound].duration) * 100}
              className="mt-4"
            />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button
                onClick={pauseRound}
                variant="outline"
                size="sm"
              >
                <Pause className="h-4 w-4 mr-2" />
                Pause
              </Button>
            </div>

            <div className="prose max-w-none text-lg leading-relaxed p-6 bg-gray-50 rounded-lg">
              {getHighlightedText()}
            </div>

            <div className="text-sm text-muted-foreground text-center">
              Follow the blue highlight to maintain your target reading speed
            </div>
          </CardContent>
        </Card>
      )}

      {/* Paused Mode */}
      {state.mode === 'paused' && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="text-lg font-medium">Exercise Paused</div>
              <p className="text-muted-foreground">
                Round {state.currentRound + 1}: {ROUND_CONFIGS[state.currentRound].name}
              </p>
              <p className="text-2xl font-bold">{formatTime(timeLeft)}</p>
              <div className="flex gap-4 justify-center">
                <Button onClick={resumeRound}>
                  <Play className="h-4 w-4 mr-2" />
                  Resume
                </Button>
                <Button onClick={resetExercise} variant="outline">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results Mode */}
      {state.mode === 'results' && (
        <Card>
          <CardHeader>
            <CardTitle>Exercise Complete!</CardTitle>
            <CardDescription>Here&apos;s your performance across all three rounds</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              {state.roundResults.map((result, index) => {
                const roundConfig = ROUND_CONFIGS[index]
                const Icon = roundConfig.icon
                
                return (
                  <div key={result.roundName} className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className={`inline-flex p-3 rounded-full text-white ${roundConfig.color} mb-2`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="font-medium">{result.roundName}</h3>
                    <div className="text-2xl font-bold text-primary mt-1">
                      {result.readingSpeed}
                    </div>
                    <div className="text-sm text-muted-foreground">WPM</div>
                  </div>
                )
              })}
            </div>

            <div className="text-center p-6 bg-blue-50 rounded-lg">
              <div className="text-lg text-blue-600">Average Reading Speed</div>
              <div className="text-3xl font-bold text-blue-600">
                {Math.round(
                  state.roundResults.reduce((sum, result) => sum + result.readingSpeed, 0) / 
                  state.roundResults.length
                )} WPM
              </div>
            </div>

            <div className="flex gap-4 justify-center">
              <Button onClick={resetExercise} variant="outline">
                <RotateCcw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              <Button asChild>
                <Link href="/exercises">View All Exercises</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}