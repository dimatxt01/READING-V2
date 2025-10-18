"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { SignOutButton } from '@/components/auth/auth-button'
import { getInitials } from '@/lib/utils/formatting'
import { 
  LayoutDashboard, 
  BookOpen, 
  ClipboardCheck, 
  Trophy, 
  Upload,
  User,
  Settings,
  Crown
} from 'lucide-react'

interface User {
  id: string
  email?: string
}

interface Profile {
  id: string
  full_name?: string | null
  avatar_url?: string | null
  role?: string | null
}

interface SidebarNavigationProps {
  user: User
  profile: Profile | null
}

const navigationItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/submit', label: 'Submit Reading', icon: Upload },
  { href: '/books', label: 'Books', icon: BookOpen },
  // { href: '/exercises', label: 'Exercises', icon: Dumbbell }, // Disabled per request
  { href: '/assessments', label: 'Assessments', icon: ClipboardCheck },
  { href: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  { href: '/subscription', label: 'Subscription', icon: Crown },
]

export function SidebarNavigation({ user, profile }: SidebarNavigationProps) {
  const pathname = usePathname()
  const isAdmin = profile?.role === 'admin'

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-gray-200 bg-white hidden lg:block">
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex h-16 items-center border-b border-gray-200 px-6">
          <Link href="/dashboard" className="flex items-center space-x-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">ReadSpeed</h1>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-6">
          {navigationItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <Icon className={`mr-3 h-5 w-5 ${
                  isActive ? 'text-emerald-500' : 'text-gray-400 group-hover:text-gray-500'
                }`} />
                {item.label}
              </Link>
            )
          })}

          {/* Admin Section */}
          {isAdmin && (
            <>
              <div className="pt-6">
                <div className="mb-3 px-3">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    Admin
                  </p>
                </div>
                <Link
                  href="/admin"
                  className={`group flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    pathname.startsWith('/admin')
                      ? 'bg-amber-50 text-amber-700'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <Settings className={`mr-3 h-5 w-5 ${
                    pathname.startsWith('/admin') ? 'text-amber-500' : 'text-gray-400 group-hover:text-gray-500'
                  }`} />
                  Admin Panel
                </Link>
              </div>
            </>
          )}
        </nav>

        {/* User Profile */}
        <div className="border-t border-gray-200 px-3 py-4">
          <Link href="/profile" className="flex items-center rounded-lg px-3 py-2 hover:bg-gray-100">
            <Avatar className="h-8 w-8">
              {profile?.avatar_url ? (
                <AvatarImage src={profile.avatar_url} alt={profile.full_name || ''} />
              ) : (
                <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs">
                  {getInitials(profile?.full_name || user.email || 'User')}
                </AvatarFallback>
              )}
            </Avatar>
            <div className="ml-3 flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {profile?.full_name || 'User'}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {profile?.role === 'admin' ? 'Admin' : 'Reader'}
              </p>
            </div>
          </Link>
          
          <div className="mt-2 px-3">
            <SignOutButton />
          </div>
        </div>
      </div>
    </aside>
  )
}