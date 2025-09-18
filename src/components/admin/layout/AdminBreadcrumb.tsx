'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight, Home } from 'lucide-react'

interface BreadcrumbItem {
  label: string
  href: string
  current?: boolean
}

const pathMap: Record<string, string> = {
  admin: 'Dashboard',
  users: 'Users',
  books: 'Books',
  features: 'Features',
  subscriptions: 'Subscriptions',
  exercises: 'Exercises',
  assessments: 'Assessments',
  analytics: 'Analytics',
  tools: 'Tools',
  settings: 'Settings',
  texts: 'Texts',
  questions: 'Questions',
  database: 'Database',
  activity: 'Activity Log',
  'word-flasher': 'Word Flasher'
}

export function AdminBreadcrumb() {
  const pathname = usePathname()
  
  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const segments = pathname.split('/').filter(Boolean)
    const breadcrumbs: BreadcrumbItem[] = []
    
    // Always start with admin dashboard
    breadcrumbs.push({
      label: 'Admin',
      href: '/admin',
      current: segments.length === 1
    })
    
    // Build path progressively
    let currentPath = ''
    for (let i = 1; i < segments.length; i++) {
      const segment = segments[i]
      currentPath += `/${segment}`
      
      breadcrumbs.push({
        label: pathMap[segment] || segment.charAt(0).toUpperCase() + segment.slice(1),
        href: `/admin${currentPath}`,
        current: i === segments.length - 1
      })
    }
    
    return breadcrumbs
  }

  const breadcrumbs = generateBreadcrumbs()

  if (breadcrumbs.length <= 1) {
    return null
  }

  return (
    <nav className="flex items-center space-x-1 text-sm text-muted-foreground px-6 py-3 border-b bg-muted/20">
      <Link href="/admin" className="flex items-center hover:text-foreground">
        <Home className="h-4 w-4" />
      </Link>
      
      {breadcrumbs.map((crumb) => (
        <div key={crumb.href} className="flex items-center space-x-1">
          <ChevronRight className="h-4 w-4" />
          {crumb.current ? (
            <span className="font-medium text-foreground">{crumb.label}</span>
          ) : (
            <Link
              href={crumb.href}
              className="hover:text-foreground transition-colors"
            >
              {crumb.label}
            </Link>
          )}
        </div>
      ))}
    </nav>
  )
}