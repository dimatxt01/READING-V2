'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Settings,
  BarChart3,
  Flag,
  Dumbbell,
  FileText,
  CreditCard,
  Database,
  ChevronDown,
  ChevronRight,
  Activity,
  Shield,
  Palette,
  LogOut,
  Brain,
  Edit3
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

interface NavItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
  children?: NavItem[]
}

const navigationItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/admin',
    icon: LayoutDashboard
  },
  {
    title: 'Subscription Tiers',
    href: '/admin/subscription-tiers',
    icon: CreditCard,
    badge: 'new'
  },
  {
    title: 'Users',
    href: '/admin/users',
    icon: Users
  },
  {
    title: 'Books',
    href: '/admin/books',
    icon: BookOpen,
    children: [
      { title: 'All Books', href: '/admin/books', icon: BookOpen },
      { title: 'Pending Approval', href: '/admin/books?status=pending', icon: Shield },
      { title: 'Book Texts', href: '/admin/books/texts', icon: FileText }
    ]
  },
  {
    title: 'Features',
    href: '/admin/features',
    icon: Flag
  },
  {
    title: 'Exercises',
    href: '/admin/exercises',
    icon: Dumbbell,
    children: [
      { title: 'All Exercises', href: '/admin/exercises', icon: Dumbbell },
      { title: 'Exercise Texts', href: '/admin/exercises/texts', icon: FileText },
      { title: 'Word Library', href: '/admin/exercises/word-flasher', icon: Palette }
    ]
  },
  {
    title: 'Assessments',
    href: '/admin/assessments',
    icon: FileText
  },
  {
    title: 'Content',
    href: '/admin/content',
    icon: Edit3,
    children: [
      { title: 'Mindset Exercise', href: '/admin/content/mindset', icon: Brain }
    ]
  },
  {
    title: 'Analytics',
    href: '/admin/analytics',
    icon: BarChart3,
    children: [
      { title: 'Overview', href: '/admin/analytics', icon: BarChart3 },
      { title: 'Users', href: '/admin/analytics/users', icon: Users },
      { title: 'Reading', href: '/admin/analytics/reading', icon: BookOpen },
      { title: 'Exercises', href: '/admin/analytics/exercises', icon: Dumbbell }
    ]
  },
  {
    title: 'Tools',
    href: '/admin/tools',
    icon: Database,
    children: [
      { title: 'Database', href: '/admin/tools/database', icon: Database },
      { title: 'System Settings', href: '/admin/settings', icon: Settings },
      { title: 'Activity Log', href: '/admin/tools/activity', icon: Activity }
    ]
  }
]

interface AdminSidebarProps {
  className?: string
}

export function AdminSidebar({ className }: AdminSidebarProps) {
  const pathname = usePathname()
  const [expandedItems, setExpandedItems] = useState<string[]>([])

  const toggleExpanded = (href: string) => {
    setExpandedItems(prev => 
      prev.includes(href) 
        ? prev.filter(item => item !== href)
        : [...prev, href]
    )
  }

  const isActive = (href: string) => {
    if (href === '/admin') {
      return pathname === '/admin'
    }
    return pathname.startsWith(href)
  }

  const renderNavItem = (item: NavItem, depth = 0) => {
    const hasChildren = item.children && item.children.length > 0
    const isExpanded = expandedItems.includes(item.href)
    const active = isActive(item.href)

    if (hasChildren) {
      return (
        <Collapsible key={item.href} open={isExpanded} onOpenChange={() => toggleExpanded(item.href)}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start gap-2 font-normal",
                depth > 0 && "ml-4 w-auto",
                active && "bg-muted font-medium"
              )}
            >
              <item.icon className="h-4 w-4" />
              <span className="flex-1 text-left">{item.title}</span>
              {item.badge && (
                <Badge variant="secondary" className="h-5 text-xs">
                  {item.badge}
                </Badge>
              )}
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-1">
            {item.children?.map(child => renderNavItem(child, depth + 1))}
          </CollapsibleContent>
        </Collapsible>
      )
    }

    return (
      <Link key={item.href} href={item.href}>
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start gap-2 font-normal",
            depth > 0 && "ml-4 w-auto",
            active && "bg-muted font-medium"
          )}
        >
          <item.icon className="h-4 w-4" />
          <span className="flex-1 text-left">{item.title}</span>
          {item.badge && (
            <Badge variant="secondary" className="h-5 text-xs">
              {item.badge}
            </Badge>
          )}
        </Button>
      </Link>
    )
  }

  return (
    <div className={cn("flex h-full w-64 flex-col bg-card", className)}>
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-primary p-2">
            <Shield className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">Admin Panel</h2>
            <p className="text-xs text-muted-foreground">ReadSpeed Management</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-auto p-4">
        <nav className="space-y-1">
          {navigationItems.map(item => renderNavItem(item))}
        </nav>
      </div>

      {/* Footer */}
      <div className="border-t p-4">
        <div className="space-y-2">
          {/* Quick Stats */}
          <div className="rounded-lg bg-muted/50 p-3">
            <h3 className="text-xs font-medium text-muted-foreground mb-2">Quick Stats</h3>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span>Total Users:</span>
                <span className="font-medium">1,247</span>
              </div>
              <div className="flex justify-between">
                <span>Books Pending:</span>
                <span className="font-medium text-orange-600">8</span>
              </div>
              <div className="flex justify-between">
                <span>Active Sessions:</span>
                <span className="font-medium text-green-600">156</span>
              </div>
            </div>
          </div>

          {/* Admin Actions */}
          <Link href="/dashboard">
            <Button variant="outline" size="sm" className="w-full">
              <LogOut className="h-4 w-4 mr-2" />
              Exit Admin
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}