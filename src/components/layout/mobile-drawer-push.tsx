'use client'

import { useState, createContext, useContext, useEffect } from 'react'
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
  children?: React.ReactNode
}

const navigationItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/submit', label: 'Submit Reading', icon: Upload },
  { href: '/books', label: 'Books', icon: BookOpen },
  { href: '/assessments', label: 'Assessments', icon: ClipboardCheck },
  { href: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  { href: '/subscription', label: 'Subscription', icon: Crown },
]

// Context to share drawer state
const DrawerContext = createContext<{
  isOpen: boolean
  toggleDrawer: () => void
}>({
  isOpen: false,
  toggleDrawer: () => {},
})

export const useDrawer = () => useContext(DrawerContext)

export function MobileDrawerPush({ user, profile, children }: MobileDrawerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()
  const isAdmin = profile?.role === 'admin'

  const toggleDrawer = () => setIsOpen(!isOpen)
  const closeDrawer = () => setIsOpen(false)

  // Close drawer on route change
  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  return (
    <DrawerContext.Provider value={{ isOpen, toggleDrawer }}>
      <div className="lg:hidden relative min-h-screen overflow-x-hidden">
        {/* Mobile Header - Fixed */}
        <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 h-16">
          <div className="flex items-center justify-between h-full px-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleDrawer}
              className="p-2 transition-transform duration-300"
              style={{
                transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)'
              }}
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

        {/* Drawer - Slides from left */}
        <div
          className={`fixed top-16 left-0 h-[calc(100vh-4rem)] w-72 bg-white shadow-xl transform transition-transform duration-300 ease-out z-40 ${
            isOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex h-full flex-col">
            {/* Close button inside drawer */}
            <div className="flex justify-end p-4 border-b border-gray-100">
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
            <nav className="flex-1 overflow-y-auto px-3 py-4">
              <div className="space-y-1">
                {navigationItems.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname === item.href

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={closeDrawer}
                      className={`group flex items-center rounded-lg px-3 py-3 text-base font-medium transition-all duration-200 ${
                        isActive
                          ? 'bg-emerald-50 text-emerald-700 shadow-sm scale-105'
                          : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 hover:scale-105'
                      }`}
                    >
                      <Icon className={`mr-3 h-6 w-6 transition-all ${
                        isActive ? 'text-emerald-500' : 'text-gray-400 group-hover:text-gray-500'
                      }`} />
                      <span>{item.label}</span>
                    </Link>
                  )
                })}

                {/* Admin Section */}
                {isAdmin && (
                  <div className="pt-6">
                    <div className="mb-3 px-3">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                        Admin
                      </p>
                    </div>
                    <Link
                      href="/admin"
                      onClick={closeDrawer}
                      className={`group flex items-center rounded-lg px-3 py-3 text-base font-medium transition-all duration-200 ${
                        pathname.startsWith('/admin')
                          ? 'bg-amber-50 text-amber-700 shadow-sm scale-105'
                          : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 hover:scale-105'
                      }`}
                    >
                      <Settings className={`mr-3 h-6 w-6 transition-all ${
                        pathname.startsWith('/admin') ? 'text-amber-500' : 'text-gray-400 group-hover:text-gray-500'
                      }`} />
                      Admin Panel
                    </Link>
                  </div>
                )}
              </div>
            </nav>

            {/* User Profile */}
            <div className="border-t border-gray-200 px-3 py-4">
              <Link
                href="/profile"
                onClick={closeDrawer}
                className="flex items-center rounded-lg px-3 py-3 hover:bg-gray-100 transition-all"
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

        {/* Main Content - Pushes to the right when drawer opens */}
        <div
          className={`min-h-screen pt-16 transition-all duration-300 ease-out ${
            isOpen ? 'translate-x-72 scale-95 opacity-75' : 'translate-x-0 scale-100 opacity-100'
          }`}
          onClick={isOpen ? closeDrawer : undefined}
        >
          {children}
        </div>
      </div>
    </DrawerContext.Provider>
  )
}

// Wrapper component for the layout
export function MobileDrawerPushLayout({ user, profile, children }: MobileDrawerProps) {
  return (
    <MobileDrawerPush user={user} profile={profile}>
      {children}
    </MobileDrawerPush>
  )
}