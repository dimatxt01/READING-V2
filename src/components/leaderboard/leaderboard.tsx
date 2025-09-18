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
  canParticipate: boolean
}

type TimeRange = 'daily' | 'weekly' | 'monthly'
type ViewMode = 'rankings' | 'chart'

export function Leaderboard({ userId, canParticipate }: LeaderboardProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('weekly')
  const [viewMode, setViewMode] = useState<ViewMode>('rankings')
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([])
  const [userRank, setUserRank] = useState<LeaderboardEntry | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true)
      try {
        const response = await fetch('/api/leaderboard', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ timeRange, limit: 10 })
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
  }, [timeRange])

  const handleRefresh = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/leaderboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timeRange, limit: 10 })
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
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {React.createElement(getRangeIcon(timeRange), { className: "h-6 w-6 text-emerald-600" })}
              <div>
                <CardTitle>Leaderboard</CardTitle>
                <p className="text-sm text-gray-600">{getRangeDescription(timeRange)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={loading}
                className="text-gray-600"
              >
                <RotateCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              {lastUpdated && (
                <span className="text-xs text-gray-500">
                  Updated {lastUpdated.toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Time Range Filter */}
          <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
            {(['daily', 'weekly', 'monthly'] as TimeRange[]).map((range) => {
              const Icon = getRangeIcon(range)
              return (
                <Button
                  key={range}
                  variant={timeRange === range ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setTimeRange(range)}
                  className="capitalize flex items-center gap-2"
                >
                  <Icon className="h-4 w-4" />
                  {range}
                </Button>
              )
            })}
          </div>

          {/* View Mode Tabs - Only show if user can participate */}
          {canParticipate && (
            <div className="flex gap-1 p-1 bg-muted rounded-lg">
              <Button
                variant={viewMode === 'rankings' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('rankings')}
                className="flex items-center gap-2"
              >
                <Trophy className="h-4 w-4" />
                Rankings
              </Button>
              <Button
                variant={viewMode === 'chart' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('chart')}
                className="flex items-center gap-2"
              >
                <ChartLine className="h-4 w-4" />
                Progress Chart
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Chart View - Only show if user can participate */}
      {canParticipate && viewMode === 'chart' && (
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
        <Card>
          <CardHeader>
            <CardTitle className="text-center">🏆 Top Performers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-center gap-4">
              {/* 2nd Place */}
              <div className="text-center">
                <div className="bg-gray-100 rounded-lg p-4 mb-2 relative">
                  <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                    <Trophy className="h-6 w-6 text-gray-400" />
                  </div>
                  <Avatar className="h-16 w-16 mx-auto mb-2 mt-2">
                    <AvatarImage src={leaderboardData[1]?.avatar_url || ''} />
                    <AvatarFallback className="bg-gray-200">
                      {leaderboardData[1]?.display_name?.substring(0, 2).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <p className="font-semibold text-sm">{leaderboardData[1]?.display_name}</p>
                  <p className="text-xs text-gray-600">{leaderboardData[1]?.total_pages} pages</p>
                </div>
                <div className="h-16 bg-gray-300 rounded-t-lg flex items-center justify-center">
                  <span className="text-white font-bold">2</span>
                </div>
              </div>

              {/* 1st Place */}
              <div className="text-center">
                <div className="bg-amber-50 rounded-lg p-4 mb-2 relative border-2 border-amber-200">
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Crown className="h-8 w-8 text-amber-500" />
                  </div>
                  <Avatar className="h-20 w-20 mx-auto mb-2 mt-3 ring-2 ring-amber-400">
                    <AvatarImage src={leaderboardData[0]?.avatar_url || ''} />
                    <AvatarFallback className="bg-amber-100 text-amber-800">
                      {leaderboardData[0]?.display_name?.substring(0, 2).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <p className="font-bold">{leaderboardData[0]?.display_name}</p>
                  <p className="text-sm text-amber-700">{leaderboardData[0]?.total_pages} pages</p>
                  <Badge className="bg-amber-500 text-white text-xs mt-1">
                    Champion
                  </Badge>
                </div>
                <div className="h-20 bg-amber-400 rounded-t-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">1</span>
                </div>
              </div>

              {/* 3rd Place */}
              <div className="text-center">
                <div className="bg-amber-50 rounded-lg p-4 mb-2 relative">
                  <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                    <Medal className="h-6 w-6 text-amber-600" />
                  </div>
                  <Avatar className="h-16 w-16 mx-auto mb-2 mt-2">
                    <AvatarImage src={leaderboardData[2]?.avatar_url || ''} />
                    <AvatarFallback className="bg-amber-100">
                      {leaderboardData[2]?.display_name?.substring(0, 2).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <p className="font-semibold text-sm">{leaderboardData[2]?.display_name}</p>
                  <p className="text-xs text-gray-600">{leaderboardData[2]?.total_pages} pages</p>
                </div>
                <div className="h-12 bg-amber-600 rounded-t-lg flex items-center justify-center">
                  <span className="text-white font-bold">3</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Full Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle>Rankings</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="animate-pulse flex items-center space-x-4">
                  <div className="rounded-full bg-gray-200 h-10 w-10"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : leaderboardData.length === 0 ? (
            <div className="text-center py-12">
              <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No Data Yet</h3>
              <p className="text-gray-500">
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
          {userRank && userRank.rank > 10 && canParticipate && (
            <Card className="border-emerald-200 bg-emerald-50">
              <CardHeader>
                <CardTitle className="text-emerald-800">Your Ranking</CardTitle>
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

      {/* Stats Summary - Show in both views if user can participate */}
      {canParticipate && userRank && (
        <Card>
          <CardHeader>
            <CardTitle>Your Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-emerald-600">{Number(userRank.total_pages) || 0}</div>
                <div className="text-sm text-gray-600">Pages Read</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{Math.round(Number(userRank.total_time) / 60) || 0}h</div>
                <div className="text-sm text-gray-600">Time Spent</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{Number(userRank.session_count) || 0}</div>
                <div className="text-sm text-gray-600">Sessions</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{Math.round(Number(userRank.avg_speed) || 0)}</div>
                <div className="text-sm text-gray-600">Avg Speed</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}