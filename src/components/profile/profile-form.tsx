"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ImageUploader } from '@/components/ui/image-uploader'
import { getInitials } from '@/lib/utils/formatting'
import { useToast } from '@/components/ui/use-toast'
import { Loader2 } from 'lucide-react'
import type { Database } from '@/lib/types/database'

type Profile = Database['public']['Tables']['profiles']['Row']

interface ProfileFormProps {
  profile: Profile | null
}

export function ProfileForm({ profile }: ProfileFormProps) {
  const [formData, setFormData] = useState({
    fullName: profile?.full_name || '',
    city: profile?.city || '',
  })
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showAvatarUploader, setShowAvatarUploader] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Upload avatar if a new file was selected
      if (avatarFile) {
        const avatarFormData = new FormData()
        avatarFormData.append('file', avatarFile)

        const avatarResponse = await fetch('/api/profile/avatar', {
          method: 'POST',
          body: avatarFormData,
        })

        if (!avatarResponse.ok) {
          const avatarError = await avatarResponse.json()
          throw new Error(avatarError.error || 'Failed to upload avatar')
        }
      }

      // Update profile information
      const updateResponse = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          full_name: formData.fullName,
          city: formData.city,
        }),
      })

      if (!updateResponse.ok) {
        const updateError = await updateResponse.json()
        throw new Error(updateError.error || 'Failed to update profile')
      }

      toast({
        title: 'Success',
        description: 'Profile updated successfully!',
      })

      // Reset avatar file and close uploader
      setAvatarFile(null)
      setShowAvatarUploader(false)
      
      // Refresh the page to show updated data
      window.location.reload()

    } catch (error) {
      console.error('Error updating profile:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update profile',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center gap-4">
        <Avatar className="h-20 w-20">
          {profile?.avatar_url ? (
            <AvatarImage src={profile.avatar_url} alt={profile.full_name || ''} />
          ) : (
            <AvatarFallback className="text-lg">
              {getInitials(profile?.full_name || 'User')}
            </AvatarFallback>
          )}
        </Avatar>
        <div>
          <Button 
            variant="outline" 
            size="sm" 
            type="button"
            onClick={() => setShowAvatarUploader(!showAvatarUploader)}
            disabled={isSubmitting}
          >
            Change Avatar
          </Button>
          <p className="text-xs text-muted-foreground mt-1">
            JPG, PNG up to 5MB
          </p>
        </div>
      </div>

      {showAvatarUploader && (
        <div className="space-y-2">
          <ImageUploader
            onFileSelect={setAvatarFile}
            onRemove={() => setAvatarFile(null)}
            label="Upload New Avatar"
            disabled={isSubmitting}
            className="max-w-sm"
            maxSize={5 * 1024 * 1024} // 5MB
          />
          {avatarFile && (
            <p className="text-sm text-muted-foreground">
              New avatar selected: {avatarFile.name}
            </p>
          )}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label htmlFor="fullName" className="text-sm font-medium">
            Full Name
          </label>
          <Input
            id="fullName"
            value={formData.fullName}
            onChange={(e) => handleChange('fullName', e.target.value)}
            placeholder="Enter your full name"
          />
        </div>

        <div>
          <label htmlFor="city" className="text-sm font-medium">
            City
          </label>
          <Input
            id="city"
            value={formData.city}
            onChange={(e) => handleChange('city', e.target.value)}
            placeholder="Enter your city"
          />
        </div>

      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          'Save Changes'
        )}
      </Button>
    </form>
  )
}