"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"
import Link from "next/link"
import { BookOpen, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils/cn"

interface CurrentBookWidgetProps {
  currentBook?: {
    id: string
    title: string
    author: string
    coverUrl?: string
    totalPages?: number
    currentPage: number
    lastReadDate?: Date
    averagePace?: number // pages per day
  }
}

export function CurrentBookWidget({ currentBook }: CurrentBookWidgetProps) {
  if (!currentBook) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Current Book</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 space-y-4">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
              <BookOpen className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <p className="text-muted-foreground mb-4">No book selected</p>
              <p className="text-sm text-muted-foreground mb-4">
                Start tracking your reading progress
              </p>
            </div>
            <Link href="/submit">
              <Button variant="outline" className="w-full">
                Select a Book
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  const progress = currentBook.totalPages 
    ? (currentBook.currentPage / currentBook.totalPages) * 100 
    : 0
  
  const pagesRemaining = currentBook.totalPages 
    ? currentBook.totalPages - currentBook.currentPage 
    : null
  
  const estimatedDaysToFinish = pagesRemaining && currentBook.averagePace
    ? Math.ceil(pagesRemaining / currentBook.averagePace)
    : null
  
  const progressColor = progress >= 75 ? "bg-green-500" : 
                       progress >= 50 ? "bg-blue-500" : 
                       progress >= 25 ? "bg-yellow-500" : 
                       "bg-gray-500"

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Current Book</CardTitle>
          {progress > 0 && (
            <Badge variant="secondary" className="text-xs">
              {Math.round(progress)}% Complete
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4">
          <div className="shrink-0 relative">
            {currentBook.coverUrl ? (
              <div className="relative">
                <Image
                  src={currentBook.coverUrl}
                  alt={currentBook.title}
                  width={80}
                  height={120}
                  className="rounded-lg object-cover shadow-sm"
                />
                {progress >= 100 && (
                  <div className="absolute inset-0 bg-green-500/20 rounded-lg flex items-center justify-center">
                    <Badge className="bg-green-500">Completed!</Badge>
                  </div>
                )}
              </div>
            ) : (
              <div className="w-20 h-[120px] bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800 rounded-lg flex items-center justify-center shadow-sm">
                <BookOpen className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
            )}
          </div>
          
          <div className="flex-1 space-y-3">
            <div>
              <h3 className="font-semibold line-clamp-1" title={currentBook.title}>
                {currentBook.title}
              </h3>
              <p className="text-sm text-muted-foreground line-clamp-1">
                by {currentBook.author}
              </p>
            </div>
            
            {currentBook.totalPages ? (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">
                    {currentBook.currentPage} / {currentBook.totalPages} pages
                  </span>
                  {pagesRemaining !== null && pagesRemaining > 0 && (
                    <span className="text-muted-foreground">
                      {pagesRemaining} left
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Progress 
                    value={progress} 
                    className="h-2 bg-gray-200 dark:bg-gray-800"
                  />
                  <div 
                    className={cn(
                      "absolute top-0 left-0 h-full rounded-full transition-all duration-500",
                      progressColor
                    )}
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  />
                </div>
                {estimatedDaysToFinish && (
                  <p className="text-xs text-muted-foreground">
                    ~{estimatedDaysToFinish} days to finish at current pace
                  </p>
                )}
              </div>
            ) : (
              <div className="bg-muted/50 rounded-md p-2">
                <p className="text-xs text-muted-foreground text-center">
                  Progress tracking unavailable
                </p>
                <p className="text-xs text-muted-foreground text-center">
                  (Total pages not set)
                </p>
              </div>
            )}
            
            <div className="flex gap-2">
              <Link href="/submit" className="flex-1">
                <Button className="w-full" size="sm">
                  Submit Pages
                </Button>
              </Link>
              <Button variant="outline" size="sm">
                <BookOpen className="h-4 w-4" />
              </Button>
            </div>
            
            {currentBook.lastReadDate && (
              <p className="text-xs text-muted-foreground text-center">
                Last read {new Date(currentBook.lastReadDate).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}