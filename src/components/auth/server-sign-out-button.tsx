'use client'

import { signOut } from '@/app/actions/auth'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '../ui/button'

interface SignOutButtonProps {
  className?: string
  variant?: 'default' | 'ghost' | 'outline' | 'secondary' | 'destructive' | 'link'
  children?: React.ReactNode
}

export function ServerSignOutButton({
  className,
  variant = 'ghost',
  children = 'Sign out'
}: SignOutButtonProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  async function handleSignOut() {
    try {
      setIsLoading(true)
      const result = await signOut()

      if ('error' in result && result.error) {
        console.error('Sign out error:', result.error)
        // Even if sign out fails, redirect to login
      }

      // Redirect to login page
      router.push('/auth/login')
      router.refresh()

    } catch (error) {
      console.error('Sign out error:', error)
      // Fallback: redirect anyway
      router.push('/auth/login')
      router.refresh()
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      onClick={handleSignOut}
      disabled={isLoading}
      className={className}
      variant={variant}
    >
      {isLoading ? 'Signing out...' : children}
    </Button>
  )
}