'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Users,
  BookOpen,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  Plus
} from 'lucide-react'
import Link from 'next/link'

interface DashboardStats {
  pendingBooks: number
  systemHealth: 'healthy' | 'warning' | 'error'
}

interface RecentActivity {
  id: string
  action: string
  timestamp: string
  details: string
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    pendingBooks: 0,
    systemHealth: 'healthy'
  })
  const [loading, setLoading] = useState(true)
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  
  const supabase = createClient()

  useEffect(() => {
    fetchDashboardData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      // Fetch pending books count
      const { count: pendingBooksCount } = await supabase
        .from('books')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')

      setStats({
        pendingBooks: pendingBooksCount || 0,
        systemHealth: 'healthy'
      })

      // Recent activity would be fetched from admin_activity_log table when implemented
      setRecentActivity([])

    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getHealthBadge = () => {
    switch (stats.systemHealth) {
      case 'healthy':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Healthy</Badge>
      case 'warning':
        return <Badge variant="secondary"><AlertTriangle className="h-3 w-3 mr-1" />Warning</Badge>
      case 'error':
        return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Error</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const quickActions = [
    {
      title: 'Approve Books',
      description: `${stats.pendingBooks} books waiting`,
      href: '/admin/books?status=pending',
      icon: BookOpen,
      badge: stats.pendingBooks > 0 ? stats.pendingBooks.toString() : undefined,
      variant: stats.pendingBooks > 0 ? 'default' : 'outline'
    },
    {
      title: 'User Management',
      description: 'Manage user accounts',
      href: '/admin/users',
      icon: Users,
      variant: 'outline'
    },
    {
      title: 'Analytics',
      description: 'View detailed analytics',
      href: '/admin/analytics',
      icon: BarChart3,
      variant: 'outline'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome to the ReadSpeed administration panel
          </p>
        </div>
        <div className="flex items-center gap-2">
          {getHealthBadge()}
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Quick Add
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Quick Actions */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Common administrative tasks and shortcuts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                {quickActions.map((action) => (
                  <Link key={action.href} href={action.href}>
                    <Card className="relative overflow-hidden transition-colors hover:bg-muted/50">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="rounded-lg bg-primary/10 p-2">
                            <action.icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium">{action.title}</h3>
                              {action.badge && (
                                <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                                  {action.badge}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {action.description}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Latest system events and admin actions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3">
                  <div className="rounded-full bg-muted p-1">
                    <Clock className="h-3 w-3" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium">{activity.action}</p>
                    <p className="text-xs text-muted-foreground">
                      {activity.details}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(activity.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}