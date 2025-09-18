'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  BookOpen, 
  Clock, 
  TrendingUp, 
  Target,
  BarChart3,
  Trophy,
  Zap,
  Dumbbell,
  ClipboardCheck
} from 'lucide-react'
import Link from 'next/link'

interface MobileDashboardProps {
  stats: {
    totalPages: number
    totalTime: number
    averageSpeed: number
    booksCompleted: number
    weeklyGoal?: number
    weeklyProgress?: number
    currentStreak?: number
  }
  recentActivity: Array<{
    id: string
    type: 'reading' | 'exercise' | 'assessment'
    title: string
    date: string
    score?: number
    pages?: number
  }>
  quickActions: Array<{
    title: string
    href: string
    icon: string
    color: string
    description: string
  }>
}

export function MobileDashboard({ stats, recentActivity, quickActions }: MobileDashboardProps) {
  const weeklyProgressPercentage = stats.weeklyGoal 
    ? Math.min((stats.weeklyProgress || 0) / stats.weeklyGoal * 100, 100)
    : 0

  // Map string icons to components
  const iconMap = {
    BookOpen,
    Dumbbell,
    ClipboardCheck,
    Trophy,
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="text-center py-4">
        <h1 className="text-2xl font-bold text-gray-900">Welcome back!</h1>
        <p className="text-gray-600 mt-1">Let&apos;s continue your reading journey</p>
      </div>

      {/* Weekly Progress Card */}
      <Card className="bg-gradient-to-r from-emerald-50 to-blue-50 border-emerald-200">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg text-emerald-800">Weekly Goal</CardTitle>
            <Badge className="bg-emerald-600">{stats.currentStreak || 0} day streak</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-emerald-700">
                {stats.weeklyProgress || 0} / {stats.weeklyGoal || 0} pages
              </span>
              <span className="font-medium text-emerald-800">
                {Math.round(weeklyProgressPercentage)}%
              </span>
            </div>
            <Progress value={weeklyProgressPercentage} className="h-3" />
            <p className="text-xs text-emerald-600 text-center">
              {stats.weeklyGoal && stats.weeklyProgress 
                ? `${stats.weeklyGoal - (stats.weeklyProgress || 0)} pages to go!`
                : 'Set a weekly goal to track progress'
              }
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Key Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="text-center">
          <CardContent className="pt-6 pb-4">
            <div className="flex flex-col items-center space-y-2">
              <div className="p-3 bg-blue-100 rounded-full">
                <BookOpen className="h-6 w-6 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {stats.totalPages.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">Pages Read</div>
            </div>
          </CardContent>
        </Card>

        <Card className="text-center">
          <CardContent className="pt-6 pb-4">
            <div className="flex flex-col items-center space-y-2">
              <div className="p-3 bg-purple-100 rounded-full">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {Math.round(stats.averageSpeed)}
              </div>
              <div className="text-sm text-gray-600">Avg Speed</div>
            </div>
          </CardContent>
        </Card>

        <Card className="text-center">
          <CardContent className="pt-6 pb-4">
            <div className="flex flex-col items-center space-y-2">
              <div className="p-3 bg-green-100 rounded-full">
                <Clock className="h-6 w-6 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {Math.round(stats.totalTime / 60)}h
              </div>
              <div className="text-sm text-gray-600">Time Spent</div>
            </div>
          </CardContent>
        </Card>

        <Card className="text-center">
          <CardContent className="pt-6 pb-4">
            <div className="flex flex-col items-center space-y-2">
              <div className="p-3 bg-amber-100 rounded-full">
                <Trophy className="h-6 w-6 text-amber-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {stats.booksCompleted}
              </div>
              <div className="text-sm text-gray-600">Books Done</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action, index) => {
              const Icon = iconMap[action.icon as keyof typeof iconMap] || BookOpen
              return (
                <Link
                  key={index}
                  href={action.href}
                  className="block"
                >
                  <div className={`p-4 rounded-lg border-2 border-dashed transition-all hover:border-solid hover:shadow-md ${action.color}`}>
                    <div className="flex flex-col items-center text-center space-y-2">
                      <Icon className="h-8 w-8" />
                      <div className="font-medium text-sm">{action.title}</div>
                      <div className="text-xs opacity-75">{action.description}</div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Recent Activity</CardTitle>
          <Link href="/profile">
            <Button variant="ghost" size="sm">
              View All
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No recent activity</p>
              <p className="text-xs mt-1">Start reading to see your progress here!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentActivity.slice(0, 3).map((activity) => (
                <div key={activity.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className={`p-2 rounded-full ${
                    activity.type === 'reading' ? 'bg-blue-100' :
                    activity.type === 'exercise' ? 'bg-purple-100' :
                    'bg-green-100'
                  }`}>
                    {activity.type === 'reading' && <BookOpen className="h-4 w-4 text-blue-600" />}
                    {activity.type === 'exercise' && <Zap className="h-4 w-4 text-purple-600" />}
                    {activity.type === 'assessment' && <Target className="h-4 w-4 text-green-600" />}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {activity.title}
                    </p>
                    <div className="flex items-center space-x-2 mt-1">
                      <p className="text-xs text-gray-500">{activity.date}</p>
                      {activity.score && (
                        <Badge variant="outline" className="text-xs">
                          {activity.score}%
                        </Badge>
                      )}
                      {activity.pages && (
                        <Badge variant="outline" className="text-xs">
                          {activity.pages} pages
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bottom Spacing for Mobile Navigation */}
      <div className="h-4 lg:hidden" />
    </div>
  )
}