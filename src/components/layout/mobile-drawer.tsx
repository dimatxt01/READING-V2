'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { SignOutButton } from '@/components/auth/auth-button'
import { getInitials } from '@/lib/utils/formatting'
import { 
  Menu,
  X,
  LayoutDashboard, 
  BookOpen, 
  Dumbbell, 
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

interface MobileDrawerProps {
  user: User
  profile: Profile | null
}

const navigationItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/submit', label: 'Submit Reading', icon: Upload },
  { href: '/books', label: 'Books', icon: BookOpen },
  { href: '/exercises', label: 'Exercises', icon: Dumbbell },
  { href: '/assessments', label: 'Assessments', icon: ClipboardCheck },
  { href: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  { href: '/subscription', label: 'Subscription', icon: Crown },
]

export function MobileDrawer({ user, profile }: MobileDrawerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()
  const isAdmin = profile?.role === 'admin'

  const toggleDrawer = () => setIsOpen(!isOpen)
  const closeDrawer = () => setIsOpen(false)

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 h-16">
        <div className="flex items-center justify-between h-full px-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleDrawer}
            className="p-2"
          >
            <Menu className="h-6 w-6" />
          </Button>
          
          <Link href="/dashboard" className="flex items-center space-x-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-lg font-bold text-gray-900">ReadSpeed</h1>
          </Link>

          <Link href="/profile">
            <Avatar className="h-8 w-8">
              {profile?.avatar_url ? (
                <AvatarImage src={profile.avatar_url} alt={profile.full_name || ''} />
              ) : (
                <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs">
                  {getInitials(profile?.full_name || user.email || 'User')}
                </AvatarFallback>
              )}
            </Avatar>
          </Link>
        </div>
      </div>

      {/* Overlay */}
      {isOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={closeDrawer}
        />
      )}

      {/* Drawer */}
      <div className={`lg:hidden fixed top-0 left-0 h-full w-80 max-w-[80vw] bg-white shadow-xl transform transition-transform duration-300 ease-in-out z-50 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex h-16 items-center justify-between border-b border-gray-200 px-6">
            <Link href="/dashboard" onClick={closeDrawer} className="flex items-center space-x-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600">
                <BookOpen className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">ReadSpeed</h1>
            </Link>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={closeDrawer}
              className="p-2"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-3 py-6">
            <div className="space-y-1">
              {navigationItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeDrawer}
                    className={`group flex items-center rounded-lg px-3 py-3 text-base font-medium transition-colors ${
                      isActive
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <Icon className={`mr-3 h-6 w-6 ${
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
                      onClick={closeDrawer}
                      className={`group flex items-center rounded-lg px-3 py-3 text-base font-medium transition-colors ${
                        pathname.startsWith('/admin')
                          ? 'bg-amber-50 text-amber-700'
                          : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                    >
                      <Settings className={`mr-3 h-6 w-6 ${
                        pathname.startsWith('/admin') ? 'text-amber-500' : 'text-gray-400 group-hover:text-gray-500'
                      }`} />
                      Admin Panel
                    </Link>
                  </div>
                </>
              )}
            </div>
          </nav>

          {/* User Profile */}
          <div className="border-t border-gray-200 px-3 py-4">
            <Link 
              href="/profile" 
              onClick={closeDrawer}
              className="flex items-center rounded-lg px-3 py-3 hover:bg-gray-100"
            >
              <Avatar className="h-10 w-10">
                {profile?.avatar_url ? (
                  <AvatarImage src={profile.avatar_url} alt={profile.full_name || ''} />
                ) : (
                  <AvatarFallback className="bg-emerald-100 text-emerald-700 text-sm">
                    {getInitials(profile?.full_name || user.email || 'User')}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="ml-3 flex-1 min-w-0">
                <p className="text-base font-medium text-gray-900 truncate">
                  {profile?.full_name || 'User'}
                </p>
                <p className="text-sm text-gray-500 truncate">
                  {profile?.role === 'admin' ? 'Admin' : 'Reader'}
                </p>
              </div>
              <User className="h-5 w-5 text-gray-400" />
            </Link>
            
            <div className="mt-3 px-3">
              <SignOutButton className="w-full justify-start" />
            </div>
          </div>
        </div>
      </div>

      {/* Content Spacer for Mobile Header */}
      <div className="lg:hidden h-16" />
    </>
  )
}