'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Play, RotateCcw, Settings } from 'lucide-react'
import Link from 'next/link'
import { ExerciseService } from '@/lib/services/exercises'
import { Exercise, ExerciseSessionResult } from '@/lib/types/exercises'

// Default word lists for different vocabulary levels
const VOCABULARY_WORDS = {
  foundation: [
    'the', 'and', 'you', 'that', 'was', 'for', 'are', 'with', 'his', 'they',
    'have', 'one', 'had', 'word', 'but', 'not', 'what', 'all', 'were', 'when',
    'your', 'can', 'said', 'each', 'which', 'she', 'how', 'will', 'now', 'many',
    'some', 'time', 'very', 'come', 'here', 'could', 'see', 'him', 'two', 'more',
    'go', 'no', 'way', 'find', 'use', 'may', 'say', 'part', 'over', 'new',
    'sound', 'take', 'only', 'little', 'work', 'know', 'place', 'year', 'live', 'me'
  ],
  intermediate: [
    'analyze', 'approach', 'available', 'benefit', 'concept', 'consist', 'context', 'create',
    'data', 'define', 'derive', 'distribute', 'economy', 'environment', 'establish', 'estimate',
    'evidence', 'export', 'factor', 'finance', 'formula', 'function', 'identify', 'income',
    'indicate', 'individual', 'interpret', 'involve', 'issue', 'labor', 'legal', 'major',
    'method', 'occur', 'percent', 'period', 'policy', 'principle', 'proceed', 'process',
    'require', 'research', 'respond', 'role', 'section', 'significant', 'similar', 'source',
    'specific', 'structure', 'theory', 'variable', 'achieve', 'acquire', 'administrate', 'affect',
    'appropriate', 'area', 'aspect', 'assist', 'assume', 'authority'
  ],
  advanced: [
    'accommodate', 'acknowledge', 'aggregate', 'albeit', 'ambiguous', 'analogy', 'anticipate', 'arbitrary',
    'attribute', 'coherent', 'coincide', 'collapse', 'colloquial', 'complement', 'comprehensive', 'comprise',
    'conceive', 'concurrent', 'confer', 'configuration', 'confine', 'consequent', 'considerable', 'contemporary',
    'contradict', 'controversy', 'convention', 'correspond', 'criteria', 'crucial', 'deduce', 'demonstrate',
    'denote', 'differentiate', 'dimension', 'discrete', 'discriminate', 'displace', 'diverse', 'domain',
    'elaborate', 'emerge', 'emphasis', 'empirical', 'enable', 'encounter', 'enhance', 'enormous',
    'entity', 'equate', 'equivalent', 'erroneous', 'establish', 'evaluate', 'eventual', 'evident'
  ]
}

interface WordFlasherState {
  mode: 'setup' | 'playing' | 'paused' | 'input' | 'results'
  currentWordIndex: number
  currentWord: string
  userAnswer: string
  words: string[]
  userAnswers: string[]
  correctAnswers: number
  startTime: Date | null
  endTime: Date | null
  responseTimes: number[]
  wordStartTime: Date | null
}

interface Settings {
  flashSpeed: number // milliseconds per word
  vocabularyLevel: 'foundation' | 'intermediate' | 'advanced'
  wordsPerRound: number
}

export default function WordFlasherPage() {
  const [exercise, setExercise] = useState<Exercise | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [settings, setSettings] = useState<Settings>({
    flashSpeed: 200,
    vocabularyLevel: 'foundation',
    wordsPerRound: 15
  })
  
  const [state, setState] = useState<WordFlasherState>({
    mode: 'setup',
    currentWordIndex: 0,
    currentWord: '',
    userAnswer: '',
    words: [],
    userAnswers: [],
    correctAnswers: 0,
    startTime: null,
    endTime: null,
    responseTimes: [],
    wordStartTime: null
  })

  // Load exercise data
  useEffect(() => {
    async function loadExercise() {
      try {
        setLoading(true)
        const exercises = await ExerciseService.getExercisesByType('word_flasher')
        if (exercises.length > 0) {
          setExercise(exercises[0])
        } else {
          setError('Word Flasher exercise not found')
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

  // Generate words for exercise
  const generateWords = useCallback(() => {
    const wordList = VOCABULARY_WORDS[settings.vocabularyLevel]
    const shuffled = [...wordList].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, settings.wordsPerRound)
  }, [settings.vocabularyLevel, settings.wordsPerRound])

  // Start exercise
  const startExercise = () => {
    const words = generateWords()
    setState({
      mode: 'playing',
      currentWordIndex: 0,
      currentWord: words[0],
      userAnswer: '',
      words,
      userAnswers: [],
      correctAnswers: 0,
      startTime: new Date(),
      endTime: null,
      responseTimes: [],
      wordStartTime: new Date()
    })
  }

  // Handle word flash timing
  useEffect(() => {
    if (state.mode === 'playing' && state.currentWordIndex < state.words.length) {
      const timer = setTimeout(() => {
        setState(prev => ({
          ...prev,
          mode: 'input',
          currentWord: ''
        }))
      }, settings.flashSpeed)

      return () => clearTimeout(timer)
    }
  }, [state.mode, state.currentWordIndex, state.words.length, settings.flashSpeed])

  // Handle answer submission
  const submitAnswer = () => {
    if (!state.userAnswer.trim()) return

    const isCorrect = state.userAnswer.toLowerCase().trim() === state.words[state.currentWordIndex].toLowerCase()
    const responseTime = state.wordStartTime ? new Date().getTime() - state.wordStartTime.getTime() : 0

    setState(prev => ({
      ...prev,
      userAnswers: [...prev.userAnswers, prev.userAnswer],
      correctAnswers: prev.correctAnswers + (isCorrect ? 1 : 0),
      responseTimes: [...prev.responseTimes, responseTime],
      userAnswer: ''
    }))

    // Move to next word or finish
    if (state.currentWordIndex + 1 < state.words.length) {
      setState(prev => ({
        ...prev,
        mode: 'playing',
        currentWordIndex: prev.currentWordIndex + 1,
        currentWord: prev.words[prev.currentWordIndex + 1],
        wordStartTime: new Date()
      }))
    } else {
      finishExercise()
    }
  }

  // Finish exercise and calculate results
  const finishExercise = async () => {
    const endTime = new Date()
    const totalTime = state.startTime ? (endTime.getTime() - state.startTime.getTime()) / 1000 : 0
    const accuracy = (state.correctAnswers / state.words.length) * 100

    setState(prev => ({
      ...prev,
      mode: 'results',
      endTime
    }))

    // Submit results to database
    if (exercise) {
      try {
        const results: ExerciseSessionResult = {
          score: accuracy,
          accuracy: accuracy,
          timeSpent: totalTime,
          totalAttempts: state.words.length,
          correctCount: state.correctAnswers,
          details: {
            wordsShown: state.words,
            userAnswers: state.userAnswers,
            responseTimes: state.responseTimes
          }
        }

        await ExerciseService.submitExerciseResult({
          exerciseId: exercise.id,
          results,
          settings: {
            flashSpeed: settings.flashSpeed,
            vocabularyLevel: settings.vocabularyLevel,
            wordsPerRound: settings.wordsPerRound
          }
        })
      } catch (err) {
        console.error('Failed to submit results:', err)
      }
    }
  }

  // Reset exercise
  const resetExercise = () => {
    setState({
      mode: 'setup',
      currentWordIndex: 0,
      currentWord: '',
      userAnswer: '',
      words: [],
      userAnswers: [],
      correctAnswers: 0,
      startTime: null,
      endTime: null,
      responseTimes: [],
      wordStartTime: null
    })
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
          <h1 className="text-2xl font-bold">{exercise?.title || 'Word Flasher'}</h1>
          <p className="text-muted-foreground">
            Words flash on screen - type what you see to improve focus and recognition speed
          </p>
        </div>
      </div>

      {/* Setup Mode */}
      {state.mode === 'setup' && (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Settings
              </CardTitle>
              <CardDescription>
                Customize your exercise parameters
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label>Vocabulary Level</Label>
                <Select value={settings.vocabularyLevel} onValueChange={(value: 'foundation' | 'intermediate' | 'advanced') => 
                  setSettings(prev => ({ ...prev, vocabularyLevel: value }))
                }>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="foundation">Foundation (Basic words)</SelectItem>
                    <SelectItem value="intermediate">Intermediate (Academic)</SelectItem>
                    <SelectItem value="advanced">Advanced (Complex terms)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Flash Speed: {settings.flashSpeed}ms per word</Label>
                <Slider
                  value={[settings.flashSpeed]}
                  onValueChange={(value) => 
                    setSettings(prev => ({ ...prev, flashSpeed: value[0] }))
                  }
                  min={50}
                  max={500}
                  step={10}
                  className="mt-2"
                />
                <div className="text-xs text-muted-foreground mt-1">
                  Faster = more challenging
                </div>
              </div>

              <div>
                <Label>Words per Round</Label>
                <Slider
                  value={[settings.wordsPerRound]}
                  onValueChange={(value) => 
                    setSettings(prev => ({ ...prev, wordsPerRound: value[0] }))
                  }
                  min={10}
                  max={50}
                  step={5}
                  className="mt-2"
                />
                <div className="text-xs text-muted-foreground mt-1">
                  Current: {settings.wordsPerRound} words
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Instructions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">1</Badge>
                  <span className="text-sm">Words will flash briefly in the center</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">2</Badge>
                  <span className="text-sm">Type each word from memory when prompted</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">3</Badge>
                  <span className="text-sm">Press Enter to submit each answer</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">4</Badge>
                  <span className="text-sm">Speed increases based on accuracy</span>
                </div>
              </div>

              <Button onClick={startExercise} className="w-full" size="lg">
                <Play className="h-4 w-4 mr-2" />
                Start Exercise
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Playing Mode */}
      {state.mode === 'playing' && (
        <Card className="min-h-[400px]">
          <CardContent className="pt-6">
            <div className="text-center space-y-8">
              <div className="text-sm text-muted-foreground">
                Word {state.currentWordIndex + 1} of {state.words.length}
              </div>
              
              <Progress 
                value={(state.currentWordIndex / state.words.length) * 100} 
                className="max-w-md mx-auto"
              />

              <div className="flex items-center justify-center min-h-[200px]">
                <div className="text-6xl font-bold text-primary animate-pulse">
                  {state.currentWord}
                </div>
              </div>

              <div className="text-sm text-muted-foreground">
                Focus on the word - it will disappear soon!
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Input Mode */}
      {state.mode === 'input' && (
        <Card className="min-h-[400px]">
          <CardContent className="pt-6">
            <div className="text-center space-y-8">
              <div className="text-sm text-muted-foreground">
                Word {state.currentWordIndex + 1} of {state.words.length}
              </div>
              
              <Progress 
                value={(state.currentWordIndex / state.words.length) * 100} 
                className="max-w-md mx-auto"
              />

              <div className="space-y-4 max-w-md mx-auto">
                <div className="text-lg font-medium">
                  What word did you see?
                </div>
                
                <Input
                  value={state.userAnswer}
                  onChange={(e) => setState(prev => ({ ...prev, userAnswer: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      submitAnswer()
                    }
                  }}
                  placeholder="Type the word here..."
                  className="text-center text-xl"
                  autoFocus
                />

                <Button onClick={submitAnswer} className="w-full" disabled={!state.userAnswer.trim()}>
                  Submit Answer
                </Button>
              </div>

              <div className="text-sm text-muted-foreground">
                Press Enter to submit quickly
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
            <CardDescription>Here&apos;s how you performed</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {Math.round((state.correctAnswers / state.words.length) * 100)}%
                </div>
                <div className="text-sm text-green-600">Accuracy</div>
              </div>
              
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {state.correctAnswers}/{state.words.length}
                </div>
                <div className="text-sm text-blue-600">Correct Words</div>
              </div>
              
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {Math.round(state.responseTimes.reduce((a, b) => a + b, 0) / state.responseTimes.length)}ms
                </div>
                <div className="text-sm text-purple-600">Avg Response</div>
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