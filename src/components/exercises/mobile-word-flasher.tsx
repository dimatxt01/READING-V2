'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Play, Pause, RotateCcw, Settings, ChevronUp, ChevronDown } from 'lucide-react'

interface MobileWordFlasherProps {
  text: string
  initialSpeed?: number
  chunkSize?: number
  onComplete?: (stats: { wpm: number; accuracy: number; duration: number }) => void
}

export function MobileWordFlasher({ 
  text, 
  initialSpeed = 300, 
  chunkSize = 1,
  onComplete 
}: MobileWordFlasherProps) {
  const [words, setWords] = useState<string[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(initialSpeed) // WPM
  const [chunk, setChunk] = useState(chunkSize)
  const [startTime, setStartTime] = useState<number | null>(null)
  const [progress, setProgress] = useState(0)
  const [showSettings, setShowSettings] = useState(false)
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const wordArray = text.split(/\s+/).filter(word => word.length > 0)
    setWords(wordArray)
    setCurrentIndex(0)
    setProgress(0)
  }, [text])

  useEffect(() => {
    if (words.length > 0) {
      setProgress((currentIndex / words.length) * 100)
    }
  }, [currentIndex, words.length])

  const getInterval = useCallback(() => {
    // Convert WPM to milliseconds per word
    return Math.round(60000 / speed)
  }, [speed])

  const startFlashing = useCallback(() => {
    if (!startTime) {
      setStartTime(Date.now())
    }
    
    setIsPlaying(true)
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
    
    intervalRef.current = setInterval(() => {
      setCurrentIndex(prev => {
        const nextIndex = prev + chunk
        if (nextIndex >= words.length) {
          setIsPlaying(false)
          if (onComplete && startTime) {
            const duration = Date.now() - startTime
            const actualWPM = Math.round((words.length / duration) * 60000)
            onComplete({
              wpm: actualWPM,
              accuracy: 100, // Not applicable for word flasher
              duration: Math.round(duration / 1000)
            })
          }
          return words.length - 1
        }
        return nextIndex
      })
    }, getInterval())
  }, [words.length, chunk, getInterval, onComplete, startTime])

  const pauseFlashing = useCallback(() => {
    setIsPlaying(false)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const resetFlashing = useCallback(() => {
    pauseFlashing()
    setCurrentIndex(0)
    setProgress(0)
    setStartTime(null)
  }, [pauseFlashing])

  const getCurrentWords = useCallback(() => {
    const start = Math.max(0, currentIndex - chunk + 1)
    const end = Math.min(words.length, currentIndex + 1)
    return words.slice(start, end)
  }, [words, currentIndex, chunk])

  // Touch gesture handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0]
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    }
  }, [])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return

    const touch = e.changedTouches[0]
    const deltaX = touch.clientX - touchStartRef.current.x
    const deltaY = touch.clientY - touchStartRef.current.y
    const deltaTime = Date.now() - touchStartRef.current.time

    // Ignore if touch lasted too long (likely a scroll)
    if (deltaTime > 300) return

    const minSwipeDistance = 50
    const maxSwipeTime = 300

    if (deltaTime < maxSwipeTime && Math.abs(deltaX) > minSwipeDistance && Math.abs(deltaY) < 100) {
      // Horizontal swipe
      if (deltaX > 0) {
        // Swipe right - decrease speed
        setSpeed(prev => Math.max(50, prev - 50))
      } else {
        // Swipe left - increase speed
        setSpeed(prev => Math.min(1000, prev + 50))
      }
    } else if (deltaTime < maxSwipeTime && Math.abs(deltaY) > minSwipeDistance && Math.abs(deltaX) < 100) {
      // Vertical swipe
      if (deltaY > 0) {
        // Swipe down - decrease chunk size
        setChunk(prev => Math.max(1, prev - 1))
      } else {
        // Swipe up - increase chunk size
        setChunk(prev => Math.min(5, prev + 1))
      }
    } else if (Math.abs(deltaX) < 20 && Math.abs(deltaY) < 20) {
      // Tap - toggle play/pause
      if (isPlaying) {
        pauseFlashing()
      } else {
        startFlashing()
      }
    }

    touchStartRef.current = null
  }, [isPlaying, startFlashing, pauseFlashing])

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  const isComplete = currentIndex >= words.length - 1

  return (
    <div className="space-y-4">
      {/* Mobile Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={isPlaying ? "destructive" : "default"}
            onClick={isPlaying ? pauseFlashing : startFlashing}
            disabled={isComplete}
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          
          <Button size="sm" variant="outline" onClick={resetFlashing}>
            <RotateCcw className="h-4 w-4" />
          </Button>
          
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="outline">{speed} WPM</Badge>
          <Badge variant="outline">{chunk} word{chunk > 1 ? 's' : ''}</Badge>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <Card className="border-emerald-200">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Touch Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="font-medium mb-1">👆 Tap</div>
                <div className="text-gray-600">Play/Pause</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="font-medium mb-1">👈 👉 Swipe</div>
                <div className="text-gray-600">Speed ±50</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="font-medium mb-1">👆 Swipe Up</div>
                <div className="text-gray-600">More Words</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="font-medium mb-1">👇 Swipe Down</div>
                <div className="text-gray-600">Fewer Words</div>
              </div>
            </div>
            
            {/* Manual Controls */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Speed</span>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSpeed(prev => Math.max(50, prev - 50))}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                  <span className="w-16 text-center text-sm">{speed} WPM</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSpeed(prev => Math.min(1000, prev + 50))}
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Words</span>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setChunk(prev => Math.max(1, prev - 1))}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                  <span className="w-16 text-center text-sm">{chunk} word{chunk > 1 ? 's' : ''}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setChunk(prev => Math.min(5, prev + 1))}
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Progress</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2" />
        <div className="flex justify-between text-xs text-gray-500">
          <span>Word {currentIndex + 1}</span>
          <span>of {words.length}</span>
        </div>
      </div>

      {/* Word Display */}
      <Card 
        ref={cardRef}
        className="min-h-[200px] flex items-center justify-center cursor-pointer touch-manipulation"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <CardContent className="text-center p-8">
          {isComplete ? (
            <div className="space-y-4">
              <div className="text-4xl font-bold text-emerald-600">✓</div>
              <div className="text-xl font-semibold">Complete!</div>
              <div className="text-gray-600">
                {words.length} words at {speed} WPM
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-3xl md:text-4xl lg:text-5xl font-mono font-bold text-gray-900 leading-tight">
                {getCurrentWords().join(' ')}
              </div>
              
              {!isPlaying && (
                <div className="text-sm text-gray-500">
                  {words.length > 0 ? 'Tap to start, swipe to adjust' : 'Loading...'}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      {startTime && (
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-lg font-bold text-emerald-600">
              {Math.round(((Date.now() - startTime) / 1000))}s
            </div>
            <div className="text-xs text-gray-600">Time</div>
          </div>
          <div>
            <div className="text-lg font-bold text-blue-600">
              {Math.round((currentIndex / words.length) * 100)}%
            </div>
            <div className="text-xs text-gray-600">Complete</div>
          </div>
          <div>
            <div className="text-lg font-bold text-purple-600">
              {speed}
            </div>
            <div className="text-xs text-gray-600">WPM</div>
          </div>
        </div>
      )}
    </div>
  )
}