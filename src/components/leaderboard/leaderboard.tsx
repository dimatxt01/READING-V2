'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { LeaderboardRow } from './leaderboard-row'
import { MultiUserProgressChart } from '@/components/dashboard/multi-user-progress-chart'
import { Crown, Trophy, Medal, TrendingUp, Calendar, RotateCcw, ChartLine } from 'lucide-react'

interface LeaderboardEntry {
  user_id: string
  full_name: string | null
  display_name: string
  avatar_url: string | null
  total_pages: number
  total_time: number
  session_count: number
  avg_speed: number
  rank: number
  subscription_tier: string
  privacy_settings: Record<string, unknown> | null
}

interface LeaderboardProps {
  userId: string
  userProfile: Record<string, unknown> | null
}

type TimeRange = 'daily' | 'weekly' | 'monthly'
type ViewMode = 'rankings' | 'chart'

export function Leaderboard({ userId }: LeaderboardProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('weekly')
  const [viewMode, setViewMode] = useState<ViewMode>('rankings')
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([])
  const [userRank, setUserRank] = useState<LeaderboardEntry | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true)
      try {
        const response = await fetch('/api/leaderboard', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ timeRange, limit: showAll ? 'all' : 10 })
        })

        const data = await response.json()

        if (!response.ok) {
          console.error('Error fetching leaderboard:', data.error)
          return
        }

        setLeaderboardData(data.leaderboard || [])
        setUserRank(data.userRank || null)
        setLastUpdated(new Date())
      } catch (error) {
        console.error('Error fetching leaderboard:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchLeaderboard()
    const interval = setInterval(fetchLeaderboard, 60000) // Refresh every minute
    return () => clearInterval(interval)
  }, [timeRange, showAll])

  const handleRefresh = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/leaderboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timeRange, limit: showAll ? 'all' : 10 })
      })

      const data = await response.json()

      if (!response.ok) {
        console.error('Error fetching leaderboard:', data.error)
        return
      }

      setLeaderboardData(data.leaderboard || [])
      setUserRank(data.userRank || null)
      setLastUpdated(new Date())
    } catch (error) {
      console.error('Error fetching leaderboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const getRangeIcon = (range: TimeRange) => {
    switch (range) {
      case 'daily': return Calendar
      case 'weekly': return Trophy
      case 'monthly': return Crown
    }
  }

  const getRangeDescription = (range: TimeRange) => {
    switch (range) {
      case 'daily': return 'Today\'s top readers'
      case 'weekly': return 'This week\'s champions'
      case 'monthly': return 'Monthly reading leaders'
    }
  }


  // Get top user IDs for chart (excluding current user)
  const topUserIds = leaderboardData
    .filter(entry => entry.user_id !== userId)
    .slice(0, 3)
    .map(entry => entry.user_id)

  return (
    <div className="space-y-6">
      {/* Main Controls Card */}
      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {React.createElement(getRangeIcon(timeRange), { className: "h-6 w-6 text-primary" })}
              <div>
                <CardTitle className="text-xl">Leaderboard</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">{getRangeDescription(timeRange)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={loading}
              >
                <RotateCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              {lastUpdated && (
                <span className="text-xs text-muted-foreground">
                  Updated {lastUpdated.toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Time Range Filter */}
          <div className="flex gap-2 p-1 bg-muted rounded-lg w-full sm:w-auto">
            {(['daily', 'weekly', 'monthly'] as TimeRange[]).map((range) => {
              const Icon = getRangeIcon(range)
              return (
                <Button
                  key={range}
                  variant={timeRange === range ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setTimeRange(range)}
                  className="capitalize flex items-center gap-2 flex-1 sm:flex-none"
                >
                  <Icon className="h-4 w-4" />
                  {range}
                </Button>
              )
            })}
          </div>

          {/* Show All Toggle */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <span className="text-sm text-muted-foreground font-medium">
              {showAll ? `Showing all ${leaderboardData.length} users` : `Showing top ${Math.min(10, leaderboardData.length)} users`}
            </span>
            <Button
              variant={showAll ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowAll(!showAll)}
              className="flex items-center gap-2"
            >
              <TrendingUp className="h-4 w-4" />
              {showAll ? 'Show Top 10' : 'Show All Users'}
            </Button>
          </div>

          {/* View Mode Tabs */}
          <div className="flex gap-2 p-1 bg-muted rounded-lg w-full">
            <Button
              variant={viewMode === 'rankings' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('rankings')}
              className="flex items-center gap-2 flex-1"
            >
              <Trophy className="h-4 w-4" />
              Rankings
            </Button>
            <Button
              variant={viewMode === 'chart' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('chart')}
              className="flex items-center gap-2 flex-1"
            >
              <ChartLine className="h-4 w-4" />
              Progress Chart
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Chart View */}
      {viewMode === 'chart' && (
        <MultiUserProgressChart
          currentUserId={userId}
          topUserIds={topUserIds}
          title="Reading Progress Comparison"
          description={topUserIds.length > 0
            ? `Comparing with top ${topUserIds.length} ${timeRange} performers`
            : `Your ${timeRange} reading progress`}
        />
      )}

      {/* Rankings View */}
      {viewMode === 'rankings' && (
        <>
          {/* Top 3 Podium */}
          {leaderboardData.length >= 3 && (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-center text-2xl">🏆 Top Performers</CardTitle>
          </CardHeader>
          <CardContent className="py-8">
            <div className="flex items-end justify-center gap-6 px-4">
              {/* 2nd Place */}
              <div className="text-center flex-1 max-w-[160px]">
                <div className="bg-muted/50 rounded-xl p-4 mb-2 relative shadow-sm border">
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Trophy className="h-7 w-7 text-slate-400" />
                  </div>
                  <Avatar className="h-16 w-16 mx-auto mb-3 mt-2 ring-2 ring-slate-200">
                    <AvatarImage src={leaderboardData[1]?.avatar_url || ''} />
                    <AvatarFallback className="bg-slate-100 text-slate-700 font-semibold">
                      {leaderboardData[1]?.display_name?.substring(0, 2).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <p className="font-semibold text-sm truncate">{leaderboardData[1]?.display_name}</p>
                  <p className="text-xs text-muted-foreground font-medium">{leaderboardData[1]?.total_pages} pages</p>
                </div>
                <div className="h-16 bg-gradient-to-t from-slate-400 to-slate-300 rounded-t-xl flex items-center justify-center shadow-md">
                  <span className="text-white font-bold text-lg">2</span>
                </div>
              </div>

              {/* 1st Place */}
              <div className="text-center flex-1 max-w-[180px]">
                <div className="bg-amber-50 rounded-xl p-4 mb-2 relative border-2 border-amber-200 shadow-lg">
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <Crown className="h-9 w-9 text-amber-500 drop-shadow-md" />
                  </div>
                  <Avatar className="h-20 w-20 mx-auto mb-3 mt-3 ring-4 ring-amber-300 shadow-md">
                    <AvatarImage src={leaderboardData[0]?.avatar_url || ''} />
                    <AvatarFallback className="bg-amber-100 text-amber-800 font-bold text-lg">
                      {leaderboardData[0]?.display_name?.substring(0, 2).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <p className="font-bold truncate">{leaderboardData[0]?.display_name}</p>
                  <p className="text-sm text-amber-700 font-semibold">{leaderboardData[0]?.total_pages} pages</p>
                  <Badge className="bg-gradient-to-r from-amber-500 to-amber-600 text-white text-xs mt-2 shadow-sm">
                    Champion
                  </Badge>
                </div>
                <div className="h-24 bg-gradient-to-t from-amber-500 to-amber-400 rounded-t-xl flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-2xl">1</span>
                </div>
              </div>

              {/* 3rd Place */}
              <div className="text-center flex-1 max-w-[160px]">
                <div className="bg-orange-50 rounded-xl p-4 mb-2 relative shadow-sm border border-orange-200">
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Medal className="h-7 w-7 text-orange-500" />
                  </div>
                  <Avatar className="h-16 w-16 mx-auto mb-3 mt-2 ring-2 ring-orange-200">
                    <AvatarImage src={leaderboardData[2]?.avatar_url || ''} />
                    <AvatarFallback className="bg-orange-100 text-orange-700 font-semibold">
                      {leaderboardData[2]?.display_name?.substring(0, 2).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <p className="font-semibold text-sm truncate">{leaderboardData[2]?.display_name}</p>
                  <p className="text-xs text-muted-foreground font-medium">{leaderboardData[2]?.total_pages} pages</p>
                </div>
                <div className="h-12 bg-gradient-to-t from-orange-500 to-orange-400 rounded-t-xl flex items-center justify-center shadow-md">
                  <span className="text-white font-bold">3</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Full Leaderboard */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl">Rankings</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="animate-pulse flex items-center space-x-4">
                  <div className="rounded-full bg-muted h-12 w-12"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-1/4"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : leaderboardData.length === 0 ? (
            <div className="text-center py-12">
              <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Data Yet</h3>
              <p className="text-muted-foreground">
                Be the first to submit reading progress for this time period!
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {leaderboardData.map((entry, index) => (
                <LeaderboardRow
                  key={entry.user_id}
                  entry={entry}
                  rank={index + 1}
                  isCurrentUser={entry.user_id === userId}
                  timeRange={timeRange}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

          {/* Current User Rank (if not in top 10) */}
          {userRank && userRank.rank > 10 && (
            <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10 shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl text-primary">Your Ranking</CardTitle>
              </CardHeader>
              <CardContent>
                <LeaderboardRow
                  entry={userRank}
                  rank={userRank.rank}
                  isCurrentUser={true}
                  timeRange={timeRange}
                  highlight={true}
                />
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Stats Summary - Show in both views */}
      {userRank && (
        <Card className="shadow-sm border-primary/20 bg-gradient-to-br from-background to-primary/5">
          <CardHeader>
            <CardTitle className="text-xl">Your Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center p-4 rounded-lg bg-background/50 border">
                <div className="text-3xl font-bold text-emerald-600 mb-1">{Number(userRank.total_pages) || 0}</div>
                <div className="text-sm text-muted-foreground font-medium">Pages Read</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-background/50 border">
                <div className="text-3xl font-bold text-blue-600 mb-1">{Math.round(Number(userRank.total_time) / 60) || 0}h</div>
                <div className="text-sm text-muted-foreground font-medium">Time Spent</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-background/50 border">
                <div className="text-3xl font-bold text-purple-600 mb-1">{Number(userRank.session_count) || 0}</div>
                <div className="text-sm text-muted-foreground font-medium">Sessions</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-background/50 border">
                <div className="text-3xl font-bold text-orange-600 mb-1">{Math.round(Number(userRank.avg_speed) || 0)}</div>
                <div className="text-sm text-muted-foreground font-medium">Avg Speed</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}