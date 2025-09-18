'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Clock, Target, Zap, BookOpen, BarChart3 } from 'lucide-react'
import { ExerciseService } from '@/lib/services/exercises'
import { Exercise, UserExerciseStats } from '@/lib/types/exercises'
import Link from 'next/link'

interface ExerciseWithStats extends Exercise {
  userStats: UserExerciseStats | null
}

export default function ExercisesPage() {
  const [exercises, setExercises] = useState<ExerciseWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadExercises() {
      try {
        setLoading(true)
        const exercisesData = await ExerciseService.getAvailableExercises('reader') // TODO: Get from user profile
        const userStats = await ExerciseService.getUserExerciseStats()
        
        // Combine exercises with user stats
        const exercisesWithStats: ExerciseWithStats[] = exercisesData.map(exercise => ({
          ...exercise,
          userStats: userStats.find(stat => stat.exercise_type === exercise.type) || null
        }))
        
        // Sort exercises by recommendation priority
        const sortedExercises = exercisesWithStats.sort((a, b) => {
          // Prioritize exercises not yet tried
          if (!a.userStats && b.userStats) return -1
          if (a.userStats && !b.userStats) return 1
          
          // Then by exercise type priority (mindset first for new users)
          const typePriority = { mindset: 0, word_flasher: 1, '3-2-1': 2 }
          const aPriority = typePriority[a.type as keyof typeof typePriority] ?? 3
          const bPriority = typePriority[b.type as keyof typeof typePriority] ?? 3
          
          return aPriority - bPriority
        })
        
        setExercises(sortedExercises)
      } catch (err) {
        setError('Failed to load exercises')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    loadExercises()
  }, [])

  const getExerciseIcon = (type: string) => {
    switch (type) {
      case 'word_flasher':
        return Zap
      case '3-2-1':
        return Target
      case 'mindset':
        return BookOpen
      default:
        return Clock
    }
  }

  const getDifficultyColor = (difficulty: string | null) => {
    switch (difficulty) {
      case 'beginner':
        return 'bg-green-100 text-green-800'
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800'
      case 'advanced':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getSubscriptionBadge = (tier: string) => {
    switch (tier) {
      case 'free':
        return <Badge variant="secondary">Free</Badge>
      case 'reader':
        return <Badge className="bg-blue-100 text-blue-800">Reader</Badge>
      case 'pro':
        return <Badge className="bg-purple-100 text-purple-800">Pro</Badge>
      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
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
              <Button onClick={() => window.location.reload()}>Try Again</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Reading Exercises</h1>
          <p className="text-muted-foreground">
            Improve your reading speed and comprehension with targeted exercises
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/exercises/stats">
            <BarChart3 className="h-4 w-4 mr-2" />
            View Stats
          </Link>
        </Button>
      </div>
        
        {/* Recommendation Section */}
        {exercises.length > 0 && !exercises[0].userStats && (
          <Card className="mt-6 border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-blue-900 flex items-center gap-2">
                <Target className="h-5 w-5" />
                Recommended for You
              </CardTitle>
              <CardDescription className="text-blue-700">
                Start with the {exercises[0].title} to build a strong foundation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="bg-blue-600 hover:bg-blue-700">
                <Link href={`/exercises/${exercises[0].type}`}>
                  Start {exercises[0].title}
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {exercises.map((exercise, index) => {
          const Icon = getExerciseIcon(exercise.type)
          const progress = exercise.userStats?.total_sessions || 0
          const isRecommended = index === 0 && !exercise.userStats
          
          return (
            <Card key={exercise.id} className={`transition-shadow hover:shadow-lg ${isRecommended ? 'border-blue-200 bg-blue-50' : ''}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">{exercise.title}</CardTitle>
                    {isRecommended && (
                      <Badge className="bg-blue-500 text-white">Recommended</Badge>
                    )}
                  </div>
                  {getSubscriptionBadge(exercise.min_subscription_tier)}
                </div>
                <CardDescription className="line-clamp-2">
                  {exercise.description}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Badge className={getDifficultyColor(exercise.difficulty)}>
                      {exercise.difficulty || 'Beginner'}
                    </Badge>
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      5m
                    </span>
                  </div>
                </div>

                {exercise.userStats && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span>{progress} sessions</span>
                    </div>
                    <Progress value={Math.min((progress / 10) * 100, 100)} />
                    
                    {exercise.userStats.best_score > 0 && (
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Best Score</span>
                          <p className="font-medium">{Math.round(exercise.userStats.best_score)}%</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Avg Accuracy</span>
                          <p className="font-medium">{Math.round(exercise.userStats.average_accuracy)}%</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button asChild className="flex-1">
                    <Link href={`/exercises/${exercise.type}`}>
                      {progress > 0 ? 'Continue' : 'Start Exercise'}
                    </Link>
                  </Button>
                  {progress > 0 && (
                    <Button asChild variant="outline">
                      <Link href={`/exercises/${exercise.type}/stats`}>
                        Stats
                      </Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {exercises.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No exercises available</h3>
              <p className="text-muted-foreground">
                Check back later for new exercises or upgrade your subscription.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}