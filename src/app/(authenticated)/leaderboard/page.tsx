import { createClient } from '@/lib/supabase/server'
import { Leaderboard } from '@/components/leaderboard/leaderboard'
import { Trophy } from 'lucide-react'

export default async function LeaderboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center mb-4">
          <Trophy className="h-10 w-10 text-amber-500 mr-3" />
          <h1 className="text-4xl font-bold tracking-tight">Leaderboard</h1>
        </div>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Compete with fellow readers and track your progress against the community
        </p>
      </div>

      {/* Main Leaderboard with integrated chart */}
      <Leaderboard
        userId={user.id}
        userProfile={profile}
      />
    </div>
  )
}