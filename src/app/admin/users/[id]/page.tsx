'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/use-toast'
import { createClient } from '@/lib/supabase/client'
import { 
  ArrowLeft,
  User,
  Shield,
  Crown,
  BookOpen,
  Users,
  Calendar,
  Edit,
  Trash2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingUp,
  Clock,
  Activity,
  Loader2,
  UserCheck,
  Download
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import Link from 'next/link'

interface UserProfile {
  id: string
  full_name: string | null
  email: string | null
  city: string | null
  avatar_url: string | null
  role: 'reader' | 'admin'
  subscription_tier: 'free' | 'reader' | 'pro'
  is_active: boolean
  created_at: string
  updated_at: string
  last_login: string | null
}

interface ReadingSubmission {
  id: string
  book_id: string
  pages_read: number
  time_spent: number
  submission_date: string
  session_timestamp: string
  notes?: string | null
  was_premium: boolean
  book?: {
    title: string
    author: string
    cover_url?: string | null
  }
}

interface UserStats {
  totalSubmissions: number
  totalPagesRead: number
  totalTimeSpent: number
  averageReadingSpeed: number
  currentStreak: number
  longestStreak: number
  booksRead: number
  averageRating: number
}

export default function UserDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const userId = params.id as string
  
  const [user, setUser] = useState<UserProfile | null>(null)
  const [submissions, setSubmissions] = useState<ReadingSubmission[]>([])
  const [stats, setStats] = useState<UserStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [editingProfile, setEditingProfile] = useState(false)
  const [deletingUser, setDeletingUser] = useState(false)
  const [editForm, setEditForm] = useState({
    full_name: '',
    email: '',
    city: '',
    role: 'reader' as 'reader' | 'admin',
    subscription_tier: 'free' as 'free' | 'reader' | 'pro',
    is_active: true
  })
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    if (userId) {
      fetchUserData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  const fetchUserData = async () => {
    setLoading(true)
    try {
      // Fetch user profile
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (userError) throw userError
      if (!userData) throw new Error('User not found')

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const userDataAny = userData as any
      setUser(userDataAny as UserProfile)
      setEditForm({
        full_name: userDataAny.full_name || '',
        email: userDataAny.email || '',
        city: userDataAny.city || '',
        role: userDataAny.role,
        subscription_tier: userDataAny.subscription_tier,
        is_active: userDataAny.is_active !== false
      })

      // Fetch reading submissions
      const { data: submissionsData, error: submissionsError } = await supabase
        .from('reading_submissions')
        .select(`
          *,
          book:books(title, author, cover_url)
        `)
        .eq('user_id', userId)
        .order('submission_date', { ascending: false })
        .limit(50)

      if (submissionsError) {
        console.warn('Error fetching submissions:', submissionsError)
        setSubmissions([])
      } else {
        setSubmissions((submissionsData || []).map(s => ({
          ...s,
          was_premium: s.was_premium ?? false,
          book: undefined
        })))
      }

      // Calculate stats
      if (submissionsData) {
        const totalSubmissions = submissionsData.length
        const totalPagesRead = submissionsData.reduce((sum, s) => sum + s.pages_read, 0)
        const totalTimeSpent = submissionsData.reduce((sum, s) => sum + s.time_spent, 0)
        const averageReadingSpeed = totalTimeSpent > 0 ? Math.round((totalPagesRead / totalTimeSpent) * 60) : 0
        
        // Get unique books
        const uniqueBooks = new Set(submissionsData.map(s => s.book_id))
        const booksRead = uniqueBooks.size

        setStats({
          totalSubmissions,
          totalPagesRead,
          totalTimeSpent,
          averageReadingSpeed,
          currentStreak: 0, // Would need streak calculation logic
          longestStreak: 0, // Would need historical streak tracking
          booksRead,
          averageRating: 0 // Would need rating system implementation
        })
      }
    } catch (error) {
      console.error('Error fetching user data:', error)
      toast({
        title: 'Error',
        description: 'Failed to load user data',
        variant: 'destructive'
      })
      router.push('/admin/users')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateProfile = async () => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editForm.full_name || null,
          email: editForm.email || null,
          city: editForm.city || null,
          role: editForm.role,
          subscription_tier: editForm.subscription_tier,
          is_active: editForm.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)

      if (error) throw error

      setUser(prev => prev ? {
        ...prev,
        full_name: editForm.full_name || null,
        email: editForm.email || null,
        city: editForm.city || null,
        role: editForm.role,
        subscription_tier: editForm.subscription_tier,
        is_active: editForm.is_active
      } : null)

      setEditingProfile(false)
      toast({
        title: 'Success',
        description: 'User profile updated successfully',
      })
    } catch (error) {
      console.error('Error updating profile:', error)
      toast({
        title: 'Error',
        description: 'Failed to update user profile',
        variant: 'destructive'
      })
    }
  }

  const handleDeleteUser = async () => {
    try {
      // In a real app, you might want to anonymize data instead of deleting
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'User deleted successfully',
      })
      
      router.push('/admin/users')
    } catch (error) {
      console.error('Error deleting user:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete user',
        variant: 'destructive'
      })
    }
  }

  const exportUserData = async () => {
    try {
      // Export user data as JSON
      const exportData = {
        profile: user,
        submissions: submissions,
        stats: stats,
        exportedAt: new Date().toISOString()
      }

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `user-${user?.full_name || user?.id}-data.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast({
        title: 'Success',
        description: 'User data exported successfully',
      })
    } catch (error) {
      console.error('Error exporting user data:', error)
      toast({
        title: 'Error',
        description: 'Failed to export user data',
        variant: 'destructive'
      })
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Shield className="h-4 w-4 text-red-500" />
      default: return <UserCheck className="h-4 w-4 text-blue-500" />
    }
  }

  const getSubscriptionIcon = (tier: string) => {
    switch (tier) {
      case 'pro': return <Crown className="h-4 w-4 text-yellow-500" />
      case 'reader': return <BookOpen className="h-4 w-4 text-blue-500" />
      default: return <Users className="h-4 w-4 text-green-500" />
    }
  }

  const getSubscriptionColor = (tier: string) => {
    switch (tier) {
      case 'pro': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
      case 'reader': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
      default: return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
      default: return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="text-center py-8">
        <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">User not found</p>
        <Link href="/admin/users">
          <Button className="mt-4">Back to Users</Button>
        </Link>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/admin/users">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Users
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{user.full_name || 'Unknown User'}</h1>
            <p className="text-muted-foreground">{user.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={exportUserData}>
              <Download className="h-4 w-4 mr-2" />
              Export Data
            </Button>
            <Button variant="outline" onClick={() => setEditingProfile(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
            <Button variant="destructive" onClick={() => setDeletingUser(true)}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete User
            </Button>
          </div>
        </div>

        {/* User Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Role</CardTitle>
              {getRoleIcon(user.role)}
            </CardHeader>
            <CardContent>
              <Badge variant="outline" className={getRoleColor(user.role)}>
                {user.role}
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Subscription</CardTitle>
              {getSubscriptionIcon(user.subscription_tier)}
            </CardHeader>
            <CardContent>
              <Badge variant="outline" className={getSubscriptionColor(user.subscription_tier)}>
                {user.subscription_tier}
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Status</CardTitle>
              {user.is_active ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
            </CardHeader>
            <CardContent>
              <Badge variant={user.is_active ? 'default' : 'secondary'}>
                {user.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Joined</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {format(new Date(user.created_at), 'MMM yyyy')}
              </div>
              <p className="text-xs text-muted-foreground">
                {format(new Date(user.created_at), 'MMM d, yyyy')}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="submissions">Reading History</TabsTrigger>
            <TabsTrigger value="profile">Profile Details</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Stats Cards */}
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Submissions</CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalSubmissions}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Pages Read</CardTitle>
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalPagesRead.toLocaleString()}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Time Spent</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{Math.round(stats.totalTimeSpent / 60)}h</div>
                    <p className="text-xs text-muted-foreground">
                      {stats.totalTimeSpent} minutes
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Reading Speed</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.averageReadingSpeed}</div>
                    <p className="text-xs text-muted-foreground">pages/hour</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest reading submissions</CardDescription>
              </CardHeader>
              <CardContent>
                {submissions.length > 0 ? (
                  <div className="space-y-4">
                    {submissions.slice(0, 5).map((submission) => (
                      <div key={submission.id} className="flex items-center gap-4 p-3 border rounded-lg">
                        {submission.book?.cover_url ? (
                          <Image
                            src={submission.book.cover_url}
                            alt={submission.book.title}
                            width={48}
                            height={64}
                            className="w-12 h-16 object-cover rounded"
                          />
                        ) : (
                          <div className="w-12 h-16 bg-muted rounded flex items-center justify-center">
                            <BookOpen className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1">
                          <h4 className="font-medium">{submission.book?.title || 'Unknown Book'}</h4>
                          <p className="text-sm text-muted-foreground">
                            {submission.pages_read} pages • {submission.time_spent} min
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(parseISO(submission.submission_date), 'MMM d, yyyy')}
                          </p>
                        </div>
                        <Badge variant="secondary">
                          {Math.round((submission.pages_read / submission.time_spent) * 60)} p/h
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No reading submissions found</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="submissions">
            <Card>
              <CardHeader>
                <CardTitle>Reading History ({submissions.length})</CardTitle>
                <CardDescription>Complete submission history</CardDescription>
              </CardHeader>
              <CardContent>
                {submissions.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Book</TableHead>
                        <TableHead>Pages</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Speed</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {submissions.map((submission) => (
                        <TableRow key={submission.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              {submission.book?.cover_url ? (
                                <Image
                                  src={submission.book.cover_url}
                                  alt={submission.book.title}
                                  width={32}
                                  height={48}
                                  className="w-8 h-12 object-cover rounded"
                                />
                              ) : (
                                <div className="w-8 h-12 bg-muted rounded flex items-center justify-center">
                                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                                </div>
                              )}
                              <div>
                                <p className="font-medium">{submission.book?.title || 'Unknown'}</p>
                                <p className="text-sm text-muted-foreground">{submission.book?.author}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{submission.pages_read}</TableCell>
                          <TableCell>{submission.time_spent}m</TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {Math.round((submission.pages_read / submission.time_spent) * 60)} p/h
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {format(parseISO(submission.submission_date), 'MMM d, yyyy')}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-muted-foreground">No submissions found</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>Complete user profile details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Full Name</Label>
                    <p className="text-sm">{user.full_name || 'Not provided'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Email</Label>
                    <p className="text-sm">{user.email || 'Not provided'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">City</Label>
                    <p className="text-sm">{user.city || 'Not provided'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">User ID</Label>
                    <p className="text-sm font-mono">{user.id}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Created</Label>
                    <p className="text-sm">{format(new Date(user.created_at), 'PPP')}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Last Updated</Label>
                    <p className="text-sm">{format(new Date(user.updated_at), 'PPP')}</p>
                  </div>
                  {user.last_login && (
                    <div>
                      <Label className="text-sm font-medium">Last Login</Label>
                      <p className="text-sm">{format(new Date(user.last_login), 'PPP')}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Profile Dialog */}
      <Dialog open={editingProfile} onOpenChange={setEditingProfile}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit User Profile</DialogTitle>
            <DialogDescription>
              Update user information and permissions
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Full Name</Label>
                <Input
                  id="edit-name"
                  value={editForm.full_name}
                  onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                  placeholder="Enter full name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  placeholder="Enter email"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-city">City</Label>
              <Input
                id="edit-city"
                value={editForm.city}
                onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                placeholder="Enter city"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-role">Role</Label>
                <Select
                  value={editForm.role}
                  onValueChange={(value: 'reader' | 'admin') =>
                    setEditForm({ ...editForm, role: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reader">Reader</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-subscription">Subscription Tier</Label>
                <Select
                  value={editForm.subscription_tier}
                  onValueChange={(value: 'free' | 'reader' | 'pro') =>
                    setEditForm({ ...editForm, subscription_tier: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="reader">Reader</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-status">Account Status</Label>
              <Select
                value={editForm.is_active ? 'active' : 'inactive'}
                onValueChange={(value) =>
                  setEditForm({ ...editForm, is_active: value === 'active' })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingProfile(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateProfile}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <Dialog open={deletingUser} onOpenChange={setDeletingUser}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this user? This action cannot be undone and will remove all user data including reading submissions.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 p-4 bg-destructive/10 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <div>
              <p className="font-medium text-destructive">This action is permanent</p>
              <p className="text-sm text-muted-foreground">
                User: {user.full_name} ({user.email})
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingUser(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteUser}>
              Delete User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}