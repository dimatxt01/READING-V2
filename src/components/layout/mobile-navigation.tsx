"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  BookOpen, 
  ClipboardCheck, 
  Trophy, 
  Upload,
  User
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

interface MobileNavigationProps {
  user: User
  profile: Profile | null
}

const navigationItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/submit', label: 'Submit', icon: Upload },
  { href: '/books', label: 'Books', icon: BookOpen },
  // { href: '/exercises', label: 'Exercises', icon: Dumbbell }, // Disabled per request
  { href: '/assessments', label: 'Tests', icon: ClipboardCheck },
  { href: '/leaderboard', label: 'Leaderboard', icon: Trophy },
]

export function MobileNavigation({}: MobileNavigationProps) { // TODO: Use profile data for user-specific navigation
  const pathname = usePathname()

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200">
      <div className="grid grid-cols-5 h-16">
        {navigationItems.slice(0, 4).map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center space-y-1 ${
                isActive
                  ? 'text-emerald-600'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          )
        })}
        
        {/* Profile/More section */}
        <Link
          href="/profile"
          className={`flex flex-col items-center justify-center space-y-1 ${
            pathname === '/profile'
              ? 'text-emerald-600'
              : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <User className="h-5 w-5" />
          <span className="text-xs font-medium">Profile</span>
        </Link>
      </div>
    </nav>
  )
}