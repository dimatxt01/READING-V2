"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { SignOutButton } from '@/components/auth/auth-button'
import { getInitials } from '@/lib/utils/formatting'

interface User {
  id: string
  email?: string
}

interface Profile {
  id: string
  full_name?: string | null
  avatar_url?: string | null
}

interface NavigationProps {
  user: User
  profile: Profile | null
}

const navigationItems = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/submit', label: 'Submit Reading' },
  { href: '/books', label: 'Books' },
  { href: '/exercises', label: 'Exercises' },
  { href: '/assessments', label: 'Assessments' },
  { href: '/leaderboard', label: 'Leaderboard' },
]

export function Navigation({ user, profile }: NavigationProps) {
  const pathname = usePathname()

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/dashboard" className="flex items-center space-x-2">
              <span className="text-2xl">📚</span>
              <h1 className="text-xl font-bold">ReadSpeed</h1>
            </Link>
          </div>

          <div className="hidden md:flex items-center space-x-1">
            {navigationItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  pathname === item.href
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center space-x-4">
            <Link href="/profile" className="flex items-center space-x-2">
              <Avatar className="h-8 w-8">
                {profile?.avatar_url ? (
                  <AvatarImage src={profile.avatar_url} alt={profile.full_name || ''} />
                ) : (
                  <AvatarFallback className="text-xs">
                    {getInitials(profile?.full_name || user.email || 'User')}
                  </AvatarFallback>
                )}
              </Avatar>
              <span className="hidden sm:block text-sm font-medium">
                {profile?.full_name || 'Profile'}
              </span>
            </Link>
            <SignOutButton />
          </div>
        </div>

        {/* Mobile navigation */}
        <div className="md:hidden border-t border-border/40">
          <div className="flex overflow-x-auto py-2 space-x-1">
            {navigationItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex-shrink-0 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  pathname === item.href
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  )
}