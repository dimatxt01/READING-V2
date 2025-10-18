'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  ArrowLeft, 
  TrendingUp, 
  Target, 
  Clock, 
  Award, 
  BarChart3,
  Calendar,
  Zap,
  BookOpen,
  Star
} from 'lucide-react'
import Link from 'next/link'
import { ExerciseService } from '@/lib/services/exercises'
import { UserExerciseStats, ExerciseResult } from '@/lib/types/exercises'

interface ExerciseStatsData {
  wordFlasher: UserExerciseStats | null
  threeTwoOne: UserExerciseStats | null
  mindset: UserExerciseStats | null
  recentResults: ExerciseResult[]
}

interface Achievement {
  id: string
  name: string
  description: string
  icon: React.ComponentType<any> // eslint-disable-line @typescript-eslint/no-explicit-any
  color: string
  progress: number
  maxProgress: number
  unlocked: boolean
}

export default function ExerciseStatsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<ExerciseStatsData>({
    wordFlasher: null,
    threeTwoOne: null,
    mindset: null,
    recentResults: []
  })

  useEffect(() => {
    async function loadStats() {
      try {
        setLoading(true)
        
        // Load all user exercise stats
        const allStats = await ExerciseService.getUserExerciseStats()
        const recentResults = await ExerciseService.getUserExerciseResults(undefined, 20)
        
        setStats({
          wordFlasher: allStats.find(s => s.exercise_type === 'word_flasher') || null,
          threeTwoOne: allStats.find(s => s.exercise_type === '3-2-1') || null,
          mindset: allStats.find(s => s.exercise_type === 'mindset') || null,
          recentResults
        })
      } catch (err) {
        setError('Failed to load exercise statistics')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    loadStats()
  }, [])

  const calculateTotalStats = () => {
    const totalSessions = [stats.wordFlasher, stats.threeTwoOne, stats.mindset]
      .filter(Boolean)
      .reduce((sum, stat) => sum + (stat?.total_sessions || 0), 0)
    
    const totalTimeSpent = [stats.wordFlasher, stats.threeTwoOne, stats.mindset]
      .filter(Boolean)
      .reduce((sum, stat) => sum + (stat?.total_time_spent || 0), 0)
    
    const avgAccuracy = [stats.wordFlasher, stats.threeTwoOne, stats.mindset]
      .filter(Boolean)
      .reduce((sum, stat) => sum + (stat?.average_accuracy || 0), 0) / 
      [stats.wordFlasher, stats.threeTwoOne, stats.mindset].filter(Boolean).length

    return { totalSessions, totalTimeSpent, avgAccuracy: isNaN(avgAccuracy) ? 0 : avgAccuracy }
  }

  const getAchievements = (): Achievement[] => {
    const { totalSessions } = calculateTotalStats()
    
    return [
      {
        id: 'first_steps',
        name: 'First Steps',
        description: 'Complete your first exercise',
        icon: Star,
        color: 'text-yellow-600 bg-yellow-100',
        progress: Math.min(totalSessions, 1),
        maxProgress: 1,
        unlocked: totalSessions >= 1
      },
      {
        id: 'consistent_practice',
        name: 'Consistent Practice',
        description: 'Complete 5 exercise sessions',
        icon: Target,
        color: 'text-blue-600 bg-blue-100',
        progress: Math.min(totalSessions, 5),
        maxProgress: 5,
        unlocked: totalSessions >= 5
      },
      {
        id: 'dedicated_learner',
        name: 'Dedicated Learner',
        description: 'Complete 25 exercise sessions',
        icon: Award,
        color: 'text-purple-600 bg-purple-100',
        progress: Math.min(totalSessions, 25),
        maxProgress: 25,
        unlocked: totalSessions >= 25
      },
      {
        id: 'speed_demon',
        name: 'Speed Demon',
        description: 'Achieve 90%+ accuracy in Word Flasher',
        icon: Zap,
        color: 'text-orange-600 bg-orange-100',
        progress: stats.wordFlasher?.best_accuracy || 0,
        maxProgress: 90,
        unlocked: (stats.wordFlasher?.best_accuracy || 0) >= 90
      },
      {
        id: 'well_rounded',
        name: 'Well Rounded',
        description: 'Try all exercise types',
        icon: BookOpen,
        color: 'text-green-600 bg-green-100',
        progress: [stats.wordFlasher, stats.threeTwoOne, stats.mindset].filter(Boolean).length,
        maxProgress: 3,
        unlocked: [stats.wordFlasher, stats.threeTwoOne, stats.mindset].every(Boolean)
      }
    ]
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getExerciseTypeColor = (type: string) => {
    switch (type) {
      case 'word_flasher':
        return 'bg-blue-100 text-blue-800'
      case '3-2-1':
        return 'bg-orange-100 text-orange-800'
      case 'mindset':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getExerciseTypeName = (type: string) => {
    switch (type) {
      case 'word_flasher':
        return 'Word Flasher'
      case '3-2-1':
        return '3-2-1 Speed'
      case 'mindset':
        return 'Mindset'
      default:
        return 'Exercise'
    }
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

  const { totalSessions, totalTimeSpent, avgAccuracy } = calculateTotalStats()
  const achievements = getAchievements()

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button asChild variant="ghost" size="sm">
          <Link href="/exercises">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Exercise Statistics</h1>
          <p className="text-muted-foreground">
            Track your progress and achievements across all exercises
          </p>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-6 md:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSessions}</div>
            <p className="text-xs text-muted-foreground">
              Across all exercises
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Time Practiced</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatTime(totalTimeSpent)}</div>
            <p className="text-xs text-muted-foreground">
              Total exercise time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Accuracy</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(avgAccuracy)}%</div>
            <p className="text-xs text-muted-foreground">
              Performance score
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Achievements</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {achievements.filter(a => a.unlocked).length}/{achievements.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Unlocked badges
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="detailed">Detailed Stats</TabsTrigger>
          <TabsTrigger value="achievements">Achievements</TabsTrigger>
          <TabsTrigger value="history">Recent Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-6 md:grid-cols-3">
            {/* Word Flasher Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-blue-600" />
                  Word Flasher
                </CardTitle>
                <CardDescription>Focus and speed training</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {stats.wordFlasher ? (
                  <>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Sessions</div>
                        <div className="font-medium">{stats.wordFlasher.total_sessions}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Best Score</div>
                        <div className="font-medium">{Math.round(stats.wordFlasher.best_score)}%</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Accuracy</div>
                        <div className="font-medium">{Math.round(stats.wordFlasher.average_accuracy)}%</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Time</div>
                        <div className="font-medium">{formatTime(stats.wordFlasher.total_time_spent)}</div>
                      </div>
                    </div>
                    <Progress value={(stats.wordFlasher.best_score / 100) * 100} />
                  </>
                ) : (
                  <p className="text-muted-foreground text-sm">No sessions completed yet</p>
                )}
              </CardContent>
            </Card>

            {/* 3-2-1 Speed Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-orange-600" />
                  3-2-1 Speed
                </CardTitle>
                <CardDescription>Progressive speed training</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {stats.threeTwoOne ? (
                  <>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Sessions</div>
                        <div className="font-medium">{stats.threeTwoOne.total_sessions}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Best WPM</div>
                        <div className="font-medium">{stats.threeTwoOne.best_wpm}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Avg WPM</div>
                        <div className="font-medium">{Math.round(stats.threeTwoOne.average_wpm)}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Time</div>
                        <div className="font-medium">{formatTime(stats.threeTwoOne.total_time_spent)}</div>
                      </div>
                    </div>
                    <Progress value={Math.min((stats.threeTwoOne.best_wpm / 500) * 100, 100)} />
                  </>
                ) : (
                  <p className="text-muted-foreground text-sm">No sessions completed yet</p>
                )}
              </CardContent>
            </Card>

            {/* Mindset Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-green-600" />
                  Mindset
                </CardTitle>
                <CardDescription>Foundation principles</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {stats.mindset ? (
                  <>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Completed</div>
                        <div className="font-medium">{stats.mindset.total_sessions}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Score</div>
                        <div className="font-medium">{Math.round(stats.mindset.best_score)}%</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Reading Time</div>
                        <div className="font-medium">{formatTime(stats.mindset.total_time_spent)}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Last Read</div>
                        <div className="font-medium">
                          {stats.mindset.last_session_at 
                            ? new Date(stats.mindset.last_session_at).toLocaleDateString()
                            : 'Never'
                          }
                        </div>
                      </div>
                    </div>
                    <Progress value={stats.mindset.total_sessions > 0 ? 100 : 0} />
                  </>
                ) : (
                  <p className="text-muted-foreground text-sm">Not read yet</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="detailed">
          <div className="space-y-6">
            {[
              { key: 'wordFlasher', name: 'Word Flasher', icon: Zap, color: 'text-blue-600' },
              { key: 'threeTwoOne', name: '3-2-1 Speed', icon: TrendingUp, color: 'text-orange-600' },
              { key: 'mindset', name: 'Mindset', icon: BookOpen, color: 'text-green-600' }
            ].map(({ key, name, icon: Icon, color }) => {
              const stat = stats[key as keyof typeof stats] as UserExerciseStats | null
              
              return (
                <Card key={key}>
                  <CardHeader>
                    <CardTitle className={`flex items-center gap-2 ${color}`}>
                      <Icon className="h-5 w-5" />
                      {name} - Detailed Statistics
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {stat ? (
                      <div className="grid gap-4 md:grid-cols-4">
                        <div className="space-y-2">
                          <div className="text-sm text-muted-foreground">Sessions</div>
                          <div className="text-2xl font-bold">{stat.total_sessions}</div>
                        </div>
                        <div className="space-y-2">
                          <div className="text-sm text-muted-foreground">Best Score</div>
                          <div className="text-2xl font-bold">{Math.round(stat.best_score)}%</div>
                        </div>
                        <div className="space-y-2">
                          <div className="text-sm text-muted-foreground">Average Score</div>
                          <div className="text-2xl font-bold">{Math.round(stat.average_score)}%</div>
                        </div>
                        <div className="space-y-2">
                          <div className="text-sm text-muted-foreground">Total Time</div>
                          <div className="text-2xl font-bold">{formatTime(stat.total_time_spent)}</div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No data available yet</p>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        <TabsContent value="achievements">
          <div className="grid gap-4 md:grid-cols-2">
            {achievements.map((achievement) => {
              const Icon = achievement.icon
              
              return (
                <Card key={achievement.id} className={`${achievement.unlocked ? 'border-green-200' : 'border-gray-200'}`}>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${achievement.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{achievement.name}</CardTitle>
                        <CardDescription>{achievement.description}</CardDescription>
                      </div>
                      {achievement.unlocked && (
                        <Badge className="bg-green-100 text-green-800">Unlocked</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Progress</span>
                        <span>{achievement.progress} / {achievement.maxProgress}</span>
                      </div>
                      <Progress 
                        value={(achievement.progress / achievement.maxProgress) * 100} 
                        className="h-2"
                      />
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Recent Exercise Sessions
              </CardTitle>
              <CardDescription>Your latest 20 exercise completions</CardDescription>
            </CardHeader>
            <CardContent>
              {stats.recentResults.length > 0 ? (
                <div className="space-y-4">
                  {stats.recentResults.map((result) => (
                    <div key={result.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge className={getExerciseTypeColor(result.exercise?.type || '')}>
                          {getExerciseTypeName(result.exercise?.type || '')}
                        </Badge>
                        <div>
                          <div className="font-medium">{result.exercise?.title}</div>
                          <div className="text-sm text-muted-foreground">
                            {formatDate(result.created_at)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">
                          {result.accuracy_percentage ? `${Math.round(result.accuracy_percentage)}%` : 'Completed'}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {result.wpm ? `${result.wpm} WPM` : formatTime(result.completion_time || 0)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No exercise sessions completed yet. Start with your first exercise!
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Cards */}
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-900">Continue Training</CardTitle>
            <CardDescription className="text-blue-700">
              Keep improving with more exercise sessions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/exercises">
                Start Exercise
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-900">Track Reading</CardTitle>
            <CardDescription className="text-green-700">
              Log your daily reading to build the habit
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link href="/submit">
                Submit Pages
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}