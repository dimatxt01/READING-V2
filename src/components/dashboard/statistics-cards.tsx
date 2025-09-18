"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatTime, formatPages, formatPace, formatStreak } from "@/lib/utils/formatting"
import { 
  BookOpen, 
  Clock, 
  TrendingUp, 
  Flame,
  ArrowUpIcon,
  ArrowDownIcon,
  MinusIcon
} from "lucide-react"
import { cn } from "@/lib/utils/cn"

interface StatisticsCardsProps {
  stats: {
    totalPagesRead: number
    totalTimeSpent: number
    averageReadingPace: number
    activeReadingStreak: number
    trends?: {
      pagesReadTrend?: number
      timeSpentTrend?: number
      readingPaceTrend?: number
      streakStatus?: 'active' | 'broken' | 'new'
    }
  }
}

interface TrendIndicatorProps {
  value: number
  className?: string
}

function TrendIndicator({ value, className }: TrendIndicatorProps) {
  const isPositive = value > 0
  const isNeutral = value === 0
  
  const Icon = isPositive ? ArrowUpIcon : isNeutral ? MinusIcon : ArrowDownIcon
  
  return (
    <div className={cn(
      "flex items-center gap-1 text-xs font-medium",
      isPositive && "text-green-600 dark:text-green-500",
      !isPositive && !isNeutral && "text-red-600 dark:text-red-500",
      isNeutral && "text-muted-foreground",
      className
    )}>
      <Icon className="h-3 w-3" />
      <span>{isNeutral ? '0%' : `${Math.abs(value)}%`}</span>
    </div>
  )
}

interface StatCardProps {
  title: string
  value: string | number
  icon: React.ComponentType<{ className?: string }>
  trend?: number
  badge?: string
  badgeVariant?: "default" | "secondary" | "destructive" | "outline"
  color?: "blue" | "green" | "purple" | "orange"
}

function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  badge, 
  badgeVariant = "secondary",
  color = "blue" 
}: StatCardProps) {
  const colorClasses = {
    blue: "text-blue-600 dark:text-blue-500",
    green: "text-green-600 dark:text-green-500",
    purple: "text-purple-600 dark:text-purple-500",
    orange: "text-orange-600 dark:text-orange-500"
  }
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          {title}
        </CardTitle>
        <Icon className={cn("h-4 w-4", colorClasses[color])} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <div className="flex items-center justify-between mt-2">
          {trend !== undefined ? (
            <TrendIndicator value={trend} />
          ) : badge ? (
            <Badge variant={badgeVariant} className="text-xs">
              {badge}
            </Badge>
          ) : null}
        </div>
        {badge && trend !== undefined && (
          <p className="text-xs text-muted-foreground mt-1">{badge}</p>
        )}
      </CardContent>
    </Card>
  )
}

export function StatisticsCards({ stats }: StatisticsCardsProps) {
  const trends = stats.trends || {}
  
  const cards = [
    {
      title: "Total Pages Read",
      value: formatPages(stats.totalPagesRead),
      icon: BookOpen,
      trend: trends.pagesReadTrend || 12,
      badge: "vs last week",
      color: "blue" as const,
    },
    {
      title: "Total Time Spent",
      value: formatTime(stats.totalTimeSpent),
      icon: Clock,
      trend: trends.timeSpentTrend || 8,
      badge: "vs last week",
      color: "green" as const,
    },
    {
      title: "Average Reading Pace",
      value: formatPace(stats.averageReadingPace),
      icon: TrendingUp,
      trend: trends.readingPaceTrend || 5,
      badge: "improvement",
      color: "purple" as const,
    },
    {
      title: "Active Reading Streak",
      value: formatStreak(stats.activeReadingStreak),
      icon: Flame,
      badge: trends.streakStatus === 'active' ? "Keep it up!" : 
             trends.streakStatus === 'broken' ? "Start again!" : 
             "New streak!",
      badgeVariant: (trends.streakStatus === 'active' ? "default" : 
                    trends.streakStatus === 'broken' ? "destructive" : 
                    "secondary") as "default" | "destructive" | "secondary",
      color: "orange" as const,
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, index) => (
        <StatCard key={index} {...card} />
      ))}
    </div>
  )
}