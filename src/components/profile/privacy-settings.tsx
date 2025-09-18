"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { Loader2 } from 'lucide-react'
import type { Database } from '@/lib/types/database'

type Profile = Database['public']['Tables']['profiles']['Row']

interface PrivacySettingsProps {
  profile: Profile | null
}

export function PrivacySettings({ profile }: PrivacySettingsProps) {
  const privacySettings = profile?.privacy_settings && 
    typeof profile.privacy_settings === 'object' && 
    !Array.isArray(profile.privacy_settings) ? 
    profile.privacy_settings as Record<string, unknown> : {}
  
  const [settings, setSettings] = useState({
    profileVisibility: (privacySettings.profile_visibility as boolean) ?? true,
    statisticsSharing: (privacySettings.statistics_sharing as boolean) ?? true,
    activityPrivacy: (privacySettings.activity_privacy as boolean) ?? false,
    leaderboardParticipation: (privacySettings.leaderboard_participation as boolean) ?? true,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const handleToggle = (setting: string) => {
    setSettings(prev => ({
      ...prev,
      [setting]: !prev[setting as keyof typeof prev],
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Convert our state to the database format
      const privacyData = {
        profile_visibility: settings.profileVisibility,
        statistics_sharing: settings.statisticsSharing,
        activity_privacy: settings.activityPrivacy,
        leaderboard_participation: settings.leaderboardParticipation,
      }

      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          privacy_settings: privacyData,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update privacy settings')
      }

      toast({
        title: 'Success',
        description: 'Privacy settings updated successfully!',
      })

    } catch (error) {
      console.error('Error updating privacy settings:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update privacy settings',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const ToggleSwitch = ({ 
    checked, 
    onToggle, 
    label, 
    description 
  }: { 
    checked: boolean
    onToggle: () => void
    label: string
    description: string
  }) => (
    <div className="flex items-center justify-between space-y-0 pb-2">
      <div className="space-y-1">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <button
        type="button"
        onClick={onToggle}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
          checked ? 'bg-primary' : 'bg-input'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <ToggleSwitch
          checked={settings.profileVisibility}
          onToggle={() => handleToggle('profileVisibility')}
          label="Public Profile"
          description="Allow others to view your profile and reading stats"
        />

        <ToggleSwitch
          checked={settings.statisticsSharing}
          onToggle={() => handleToggle('statisticsSharing')}
          label="Share Statistics"
          description="Include your stats in community averages and comparisons"
        />

        <ToggleSwitch
          checked={!settings.activityPrivacy}
          onToggle={() => handleToggle('activityPrivacy')}
          label="Activity Visibility"
          description="Show your reading activity to other users"
        />

        <ToggleSwitch
          checked={settings.leaderboardParticipation}
          onToggle={() => handleToggle('leaderboardParticipation')}
          label="Leaderboard Participation"
          description="Include your progress in community leaderboards"
        />
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          'Save Privacy Settings'
        )}
      </Button>
    </form>
  )
}