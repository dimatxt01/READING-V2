import { createClient } from '@/lib/supabase/server'
import { Leaderboard } from '@/components/leaderboard/leaderboard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Crown, Trophy, Medal, Award } from 'lucide-react'

export default async function LeaderboardPage() {
  const supabase = await createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  // Get user profile to check subscription and participation status
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const privacySettings = profile?.privacy_settings as Record<string, unknown> | null
  const leaderboardSettings = privacySettings?.leaderboard as Record<string, unknown> | null
  const canParticipate = profile?.subscription_tier !== 'free' && 
                        leaderboardSettings?.showOnLeaderboard !== false

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center mb-4">
          <Trophy className="h-8 w-8 text-amber-500 mr-3" />
          <h1 className="text-3xl font-bold text-gray-900">Leaderboard</h1>
        </div>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Compete with fellow readers and track your progress against the community. 
          Join the challenge and see how you rank!
        </p>
      </div>

      {/* Participation Status */}
      {profile?.subscription_tier === 'free' ? (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-800">
              <Crown className="h-5 w-5" />
              Upgrade to Participate
            </CardTitle>
            <CardDescription className="text-amber-700">
              Join the leaderboard competition by upgrading to Reader or Pro tier
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 mb-4">
              <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                <Medal className="h-3 w-3 mr-1" />
                Daily Rankings
              </Badge>
              <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                <Award className="h-3 w-3 mr-1" />
                Weekly Challenges
              </Badge>
              <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                <Trophy className="h-3 w-3 mr-1" />
                Monthly Champions
              </Badge>
            </div>
            <a 
              href="/subscription" 
              className="inline-flex items-center px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
            >
              View Subscription Plans
            </a>
          </CardContent>
        </Card>
      ) : !canParticipate ? (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-800">Leaderboard Participation</CardTitle>
            <CardDescription className="text-blue-700">
              You&apos;re eligible to participate! Check your privacy settings to join the leaderboard.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <a 
              href="/profile" 
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Update Privacy Settings
            </a>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-emerald-200 bg-emerald-50">
          <CardHeader>
            <CardTitle className="text-emerald-800">You&apos;re Participating!</CardTitle>
            <CardDescription className="text-emerald-700">
              Your reading progress is being tracked on the leaderboard
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Main Leaderboard with integrated chart */}
      <Leaderboard 
        userId={user.id} 
        userProfile={profile}
        canParticipate={canParticipate}
      />
    </div>
  )
}