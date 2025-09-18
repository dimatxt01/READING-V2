"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatDistanceToNow } from "date-fns"
import { 
  BookOpen, 
  Brain, 
  Trophy, 
  FileText,
  TrendingUp,
  Star,
  Activity,
  ChevronRight
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils/cn"

interface ActivityItem {
  id: string
  type: "reading" | "exercise" | "achievement" | "review" | "milestone"
  title: string
  description: string
  timestamp: Date
  metadata?: {
    pages?: number
    minutes?: number
    score?: number
    bookTitle?: string
    exerciseType?: string
    achievementLevel?: "bronze" | "silver" | "gold"
    rating?: number
  }
}

interface RecentActivityProps {
  activities: ActivityItem[]
  showViewAll?: boolean
}

export function RecentActivity({ activities, showViewAll = true }: RecentActivityProps) {
  const getActivityIcon = (activity: ActivityItem) => {
    const iconClass = "h-4 w-4"
    switch (activity.type) {
      case "reading":
        return <BookOpen className={iconClass} />
      case "exercise":
        return <Brain className={iconClass} />
      case "achievement":
        return <Trophy className={iconClass} />
      case "review":
        return <Star className={iconClass} />
      case "milestone":
        return <TrendingUp className={iconClass} />
      default:
        return <FileText className={iconClass} />
    }
  }

  const getActivityColor = (type: ActivityItem["type"]) => {
    switch (type) {
      case "reading":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
      case "exercise":
        return "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300"
      case "achievement":
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
      case "review":
        return "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
      case "milestone":
        return "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300"
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300"
    }
  }

  const getActivityBadgeVariant = (type: ActivityItem["type"]): "default" | "secondary" | "destructive" | "outline" => {
    switch (type) {
      case "achievement":
        return "default"
      case "milestone":
        return "destructive"
      default:
        return "secondary"
    }
  }

  const formatMetadata = (metadata: ActivityItem["metadata"]) => {
    if (!metadata) return null
    
    const parts = []
    if (metadata.pages) parts.push(`${metadata.pages} pages`)
    if (metadata.minutes) parts.push(`${metadata.minutes} min`)
    if (metadata.score) parts.push(`${metadata.score}% score`)
    if (metadata.rating) {
      parts.push(
        <span key="rating" className="flex items-center gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star 
              key={i} 
              className={cn(
                "h-3 w-3",
                i < metadata.rating! ? "fill-yellow-500 text-yellow-500" : "text-gray-300"
              )} 
            />
          ))}
        </span>
      )
    }
    
    return parts.length > 0 ? (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {parts.map((part, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <span className="text-gray-400">•</span>}
            {part}
          </span>
        ))}
      </div>
    ) : null
  }

  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Your reading journey events</CardDescription>
            </div>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 space-y-4">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
              <Activity className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <p className="text-muted-foreground mb-2">No activity yet</p>
              <p className="text-sm text-muted-foreground">
                Start reading or complete an exercise to see your activity here
              </p>
            </div>
            <Link href="/submit">
              <Button variant="outline" size="sm">
                Start Reading
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your latest reading journey events</CardDescription>
          </div>
          {showViewAll && activities.length > 5 && (
            <Button variant="ghost" size="sm" asChild>
              <Link href="/activity">
                View All
                <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.slice(0, 5).map((activity, index) => (
            <div 
              key={activity.id} 
              className={cn(
                "flex items-start gap-3 group",
                index !== 0 && "pt-4 border-t"
              )}
            >
              <div className={cn(
                "p-2 rounded-lg transition-colors",
                getActivityColor(activity.type)
              )}>
                {getActivityIcon(activity)}
              </div>
              
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-medium truncate">
                        {activity.title}
                      </h4>
                      {activity.metadata?.achievementLevel && (
                        <Badge 
                          variant={getActivityBadgeVariant(activity.type)} 
                          className="text-xs capitalize"
                        >
                          {activity.metadata.achievementLevel}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {activity.description}
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                  </div>
                </div>
                
                {formatMetadata(activity.metadata)}
                
                {activity.metadata?.bookTitle && (
                  <p className="text-xs text-muted-foreground italic">
                    &quot;{activity.metadata.bookTitle}&quot;
                  </p>
                )}
                
                {activity.metadata?.exerciseType && (
                  <Badge variant="outline" className="text-xs">
                    {activity.metadata.exerciseType}
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
        
        {activities.length > 5 && (
          <div className="mt-4 pt-4 border-t text-center">
            <p className="text-xs text-muted-foreground">
              {activities.length - 5} more activities
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}