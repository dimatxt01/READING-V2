'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Crown, Trophy, Medal, Clock, BookOpen, Zap } from 'lucide-react'

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

interface LeaderboardRowProps {
  entry: LeaderboardEntry
  rank: number
  isCurrentUser: boolean
  timeRange: 'daily' | 'weekly' | 'monthly'
  highlight?: boolean
}

export function LeaderboardRow({ 
  entry, 
  rank, 
  isCurrentUser, 
  highlight = false 
}: LeaderboardRowProps) {
  const getRankIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Crown className="h-5 w-5 text-amber-500" />
      case 2:
        return <Trophy className="h-5 w-5 text-gray-400" />
      case 3:
        return <Medal className="h-5 w-5 text-amber-600" />
      default:
        return (
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100">
            <span className="text-sm font-bold text-gray-600">#{position}</span>
          </div>
        )
    }
  }

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case 'pro':
        return <Badge className="bg-purple-100 text-purple-800 border-purple-200">Pro</Badge>
      case 'reader':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Reader</Badge>
      default:
        return null
    }
  }

  const getDisplayName = () => {
    const privacySettings = entry.privacy_settings as Record<string, unknown> | null
    const leaderboardSettings = privacySettings?.leaderboard as Record<string, unknown> | null
    
    if (leaderboardSettings?.useRealName && entry.full_name) {
      return entry.full_name
    }
    return entry.display_name || 'Anonymous Reader'
  }

  const shouldShowAvatar = () => {
    const privacySettings = entry.privacy_settings as Record<string, unknown> | null
    const profileSettings = privacySettings?.profile as Record<string, unknown> | null
    return profileSettings?.showAvatar !== false
  }

  const formatTime = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}m`
    }
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
  }

  const getMotivationalTitle = () => {
    if (rank === 1) return "👑 Reading Champion"
    if (rank <= 3) return "🏆 Top Performer"
    if (rank <= 10) return "⭐ Elite Reader"
    if (entry.total_pages >= 1000) return "📚 Book Warrior"
    if (entry.session_count >= 7) return "🔥 Consistent Reader"
    return "📖 Active Reader"
  }

  return (
    <div className={`
      flex items-center p-4 rounded-lg transition-all duration-200 hover:shadow-md
      ${isCurrentUser 
        ? 'bg-emerald-50 border-2 border-emerald-200 ring-1 ring-emerald-300' 
        : 'bg-white border border-gray-200 hover:border-gray-300'
      }
      ${highlight ? 'shadow-lg' : ''}
    `}>
      {/* Rank Icon */}
      <div className="flex-shrink-0 mr-4">
        {getRankIcon(rank)}
      </div>

      {/* Avatar */}
      <div className="flex-shrink-0 mr-4">
        <Avatar className={`h-12 w-12 ${rank <= 3 ? 'ring-2 ring-offset-2' : ''} ${
          rank === 1 ? 'ring-amber-400' : 
          rank === 2 ? 'ring-gray-400' : 
          rank === 3 ? 'ring-amber-600' : ''
        }`}>
          {shouldShowAvatar() && entry.avatar_url ? (
            <AvatarImage src={entry.avatar_url} alt={getDisplayName()} />
          ) : (
            <AvatarFallback className={`
              ${rank === 1 ? 'bg-amber-100 text-amber-700' : 
                rank <= 3 ? 'bg-gray-100 text-gray-700' : 
                'bg-emerald-100 text-emerald-700'
              }
            `}>
              {getDisplayName().substring(0, 2).toUpperCase()}
            </AvatarFallback>
          )}
        </Avatar>
      </div>

      {/* User Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className={`font-semibold truncate ${
            isCurrentUser ? 'text-emerald-800' : 'text-gray-900'
          }`}>
            {getDisplayName()}
          </h3>
          {isCurrentUser && (
            <Badge variant="outline" className="text-xs text-emerald-700 border-emerald-300">
              You
            </Badge>
          )}
          {getTierBadge(entry.subscription_tier)}
        </div>
        
        <p className="text-xs text-gray-500 mb-2">{getMotivationalTitle()}</p>
        
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1 text-blue-600">
            <BookOpen className="h-4 w-4" />
            <span className="font-medium">{entry.total_pages}</span>
            <span className="text-gray-500">pages</span>
          </div>
          
          <div className="flex items-center gap-1 text-purple-600">
            <Clock className="h-4 w-4" />
            <span className="font-medium">{formatTime(entry.total_time)}</span>
          </div>
          
          <div className="flex items-center gap-1 text-orange-600">
            <Zap className="h-4 w-4" />
            <span className="font-medium">{Math.round(Number(entry.avg_speed) || 0)}</span>
            <span className="text-gray-500">p/h</span>
          </div>
        </div>
      </div>

      {/* Performance Indicator */}
      <div className="flex-shrink-0 text-right">
        <div className={`text-lg font-bold ${
          rank === 1 ? 'text-amber-600' :
          rank <= 3 ? 'text-gray-600' :
          'text-emerald-600'
        }`}>
          {entry.total_pages}
        </div>
        <div className="text-xs text-gray-500">
          {entry.session_count} session{entry.session_count !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Achievement Glow Effect for Top 3 */}
      {rank <= 3 && (
        <div className={`absolute inset-0 rounded-lg pointer-events-none ${
          rank === 1 ? 'bg-gradient-to-r from-amber-100/20 to-yellow-100/20' :
          rank === 2 ? 'bg-gradient-to-r from-gray-100/20 to-slate-100/20' :
          'bg-gradient-to-r from-amber-100/10 to-orange-100/10'
        }`} />
      )}
    </div>
  )
}