'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
  Users,
  Download,
  Mail,
  Upload,
  Search,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Send,
  UserCheck,
  Shield,
  Crown,
  BookOpen,
  UserX,
  RefreshCw
} from 'lucide-react'
import { format } from 'date-fns'
import Link from 'next/link'

interface User {
  id: string
  full_name: string | null
  email: string | null
  city: string | null
  role: 'reader' | 'admin'
  subscription_tier: 'free' | 'reader' | 'pro'
  is_active: boolean
  created_at: string
  selected?: boolean
}

interface BulkAction {
  id: string
  type: 'email' | 'role_update' | 'subscription_update' | 'status_update' | 'export'
  status: 'pending' | 'processing' | 'completed' | 'failed'
  target_count: number
  processed_count: number
  created_at: string
  completed_at?: string
  error_message?: string
  details: Record<string, unknown>
}

export default function BulkActionsPage() {
  const [users, setUsers] = useState<User[]>([])
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [subscriptionFilter, setSubscriptionFilter] = useState<string>('all')
  const [activeTab, setActiveTab] = useState('select')
  const [bulkActions, setBulkActions] = useState<BulkAction[]>([])

  // Email form
  const [emailAction, setEmailAction] = useState(false)
  const [emailSubject, setEmailSubject] = useState('')
  const [emailContent, setEmailContent] = useState('')

  // Role/Subscription update form
  const [bulkUpdateAction, setBulkUpdateAction] = useState(false)
  const [updateType, setUpdateType] = useState<'role' | 'subscription' | 'status'>('role')
  const [newRole, setNewRole] = useState<'reader' | 'admin'>('reader')
  const [newSubscription, setNewSubscription] = useState<'free' | 'reader' | 'pro'>('free')
  const [newStatus, setNewStatus] = useState<boolean>(true)

  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    fetchUsers()
    fetchBulkActions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, roleFilter, subscriptionFilter])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('profiles')
        .select('*')

      // Apply filters
      if (searchQuery) {
        query = query.or(`full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
      }

      if (roleFilter !== 'all') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        query = query.eq('role', roleFilter as any)
      }

      if (subscriptionFilter !== 'all') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        query = query.eq('subscription_tier', subscriptionFilter as any)
      }

      query = query.order('created_at', { ascending: false })

      const { data, error } = await query

      if (error) throw error

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setUsers((data || []).map((user: any) => ({ ...user, selected: false })))
    } catch (error) {
      console.error('Error fetching users:', error)
      toast({
        title: 'Error',
        description: 'Failed to load users',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchBulkActions = async () => {
    // In a real app, you'd fetch from a bulk_actions table
    // For now, we'll use a placeholder
    setBulkActions([])
  }

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  const toggleAllUsers = () => {
    const filteredUserIds = users.map(user => user.id)
    setSelectedUsers(prev => 
      prev.length === filteredUserIds.length 
        ? [] 
        : filteredUserIds
    )
  }

  const selectByFilter = (filter: 'active' | 'inactive' | 'free' | 'reader' | 'pro' | 'admin_role' | 'reader_role') => {
    let filtered: string[] = []
    
    switch (filter) {
      case 'active':
        filtered = users.filter(u => u.is_active).map(u => u.id)
        break
      case 'inactive':
        filtered = users.filter(u => !u.is_active).map(u => u.id)
        break
      case 'free':
        filtered = users.filter(u => u.subscription_tier === 'free').map(u => u.id)
        break
      case 'reader':
        filtered = users.filter(u => u.subscription_tier === 'reader').map(u => u.id)
        break
      case 'pro':
        filtered = users.filter(u => u.subscription_tier === 'pro').map(u => u.id)
        break
      case 'admin_role':
        filtered = users.filter(u => u.role === 'admin').map(u => u.id)
        break
      case 'reader_role':
        filtered = users.filter(u => u.role === 'reader').map(u => u.id)
        break
    }
    
    setSelectedUsers(filtered)
    toast({
      title: 'Selection Updated',
      description: `Selected ${filtered.length} users`,
    })
  }

  const handleBulkEmail = async () => {
    if (selectedUsers.length === 0) {
      toast({
        title: 'No Users Selected',
        description: 'Please select users to send emails to',
        variant: 'destructive'
      })
      return
    }

    if (!emailSubject.trim() || !emailContent.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Please provide both subject and content for the email',
        variant: 'destructive'
      })
      return
    }

    try {
      // In a real app, you'd queue this as a background job
      // For now, we'll just simulate the action
      const newAction: BulkAction = {
        id: Math.random().toString(36).substr(2, 9),
        type: 'email',
        status: 'processing',
        target_count: selectedUsers.length,
        processed_count: 0,
        created_at: new Date().toISOString(),
        details: {
          subject: emailSubject,
          content: emailContent
        }
      }

      setBulkActions(prev => [newAction, ...prev])
      setEmailAction(false)
      setEmailSubject('')
      setEmailContent('')
      setSelectedUsers([])

      toast({
        title: 'Email Queued',
        description: `Email queued for ${selectedUsers.length} users`,
      })

      // Simulate processing
      setTimeout(() => {
        setBulkActions(prev => prev.map(action => 
          action.id === newAction.id 
            ? { ...action, status: 'completed' as const, processed_count: action.target_count, completed_at: new Date().toISOString() }
            : action
        ))
      }, 3000)
    } catch (error) {
      console.error('Error sending bulk email:', error)
      toast({
        title: 'Error',
        description: 'Failed to queue bulk email',
        variant: 'destructive'
      })
    }
  }

  const handleBulkUpdate = async () => {
    if (selectedUsers.length === 0) {
      toast({
        title: 'No Users Selected',
        description: 'Please select users to update',
        variant: 'destructive'
      })
      return
    }

    try {
      let updateData: Record<string, unknown> = {}

      switch (updateType) {
        case 'role':
          updateData = { role: newRole }
          break
        case 'subscription':
          updateData = { subscription_tier: newSubscription }
          break
        case 'status':
          updateData = { is_active: newStatus }
          break
      }

      // Update users in batches
      for (let i = 0; i < selectedUsers.length; i += 10) {
        const batch = selectedUsers.slice(i, i + 10)
        const { error } = await supabase
          .from('profiles')
          .update({ ...updateData, updated_at: new Date().toISOString() })
          .in('id', batch)

        if (error) throw error
      }

      // Create action record
      const newAction: BulkAction = {
        id: Math.random().toString(36).substr(2, 9),
        type: `${updateType}_update` as 'role_update' | 'subscription_update' | 'status_update',
        status: 'completed',
        target_count: selectedUsers.length,
        processed_count: selectedUsers.length,
        created_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        details: updateData
      }

      setBulkActions(prev => [newAction, ...prev])
      setBulkUpdateAction(false)
      setSelectedUsers([])

      // Refresh user list
      fetchUsers()

      toast({
        title: 'Bulk Update Completed',
        description: `Updated ${selectedUsers.length} users successfully`,
      })
    } catch (error) {
      console.error('Error updating users:', error)
      toast({
        title: 'Error',
        description: 'Failed to update users',
        variant: 'destructive'
      })
    }
  }

  const handleExportUsers = () => {
    if (selectedUsers.length === 0) {
      toast({
        title: 'No Users Selected',
        description: 'Please select users to export',
        variant: 'destructive'
      })
      return
    }

    try {
      const selectedUserData = users.filter(user => selectedUsers.includes(user.id))
      const exportData = selectedUserData.map(user => ({
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        city: user.city,
        role: user.role,
        subscription_tier: user.subscription_tier,
        is_active: user.is_active,
        created_at: user.created_at
      }))

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `users-export-${format(new Date(), 'yyyy-MM-dd')}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      // Create action record
      const newAction: BulkAction = {
        id: Math.random().toString(36).substr(2, 9),
        type: 'export',
        status: 'completed',
        target_count: selectedUsers.length,
        processed_count: selectedUsers.length,
        created_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        details: { format: 'json' }
      }

      setBulkActions(prev => [newAction, ...prev])

      toast({
        title: 'Export Completed',
        description: `Exported ${selectedUsers.length} users`,
      })
    } catch (error) {
      console.error('Error exporting users:', error)
      toast({
        title: 'Error',
        description: 'Failed to export users',
        variant: 'destructive'
      })
    }
  }

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'email': return <Mail className="h-4 w-4" />
      case 'role_update': return <Shield className="h-4 w-4" />
      case 'subscription_update': return <Crown className="h-4 w-4" />
      case 'status_update': return <UserX className="h-4 w-4" />
      case 'export': return <Download className="h-4 w-4" />
      default: return <RefreshCw className="h-4 w-4" />
    }
  }

  const getActionStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600'
      case 'processing': return 'text-blue-600'
      case 'failed': return 'text-red-600'
      default: return 'text-gray-600'
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
            <h1 className="text-2xl font-bold">Bulk User Actions</h1>
            <p className="text-muted-foreground">Perform actions on multiple users at once</p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="select">Select Users</TabsTrigger>
            <TabsTrigger value="actions">Actions</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="select" className="space-y-6">
            {/* Quick Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Selection</CardTitle>
                <CardDescription>Select users by common criteria</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => selectByFilter('active')}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Active Users
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => selectByFilter('inactive')}>
                    <UserX className="h-4 w-4 mr-2" />
                    Inactive Users
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => selectByFilter('free')}>
                    <Users className="h-4 w-4 mr-2" />
                    Free Tier
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => selectByFilter('reader')}>
                    <BookOpen className="h-4 w-4 mr-2" />
                    Reader Tier
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => selectByFilter('pro')}>
                    <Crown className="h-4 w-4 mr-2" />
                    Pro Tier
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => selectByFilter('reader_role')}>
                    <UserCheck className="h-4 w-4 mr-2" />
                    Readers
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => selectByFilter('admin_role')}>
                    <Shield className="h-4 w-4 mr-2" />
                    Admins
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle>Filters & Search</CardTitle>
                <CardDescription>Filter users before selection</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name or email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Role Filter</Label>
                      <Select value={roleFilter} onValueChange={setRoleFilter}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Roles</SelectItem>
                          <SelectItem value="reader">Reader</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Subscription Filter</Label>
                      <Select value={subscriptionFilter} onValueChange={setSubscriptionFilter}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Tiers</SelectItem>
                          <SelectItem value="free">Free</SelectItem>
                          <SelectItem value="reader">Reader</SelectItem>
                          <SelectItem value="pro">Pro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* User List */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Users ({users.length})</CardTitle>
                    <CardDescription>
                      {selectedUsers.length > 0 && `${selectedUsers.length} selected`}
                    </CardDescription>
                  </div>
                  {selectedUsers.length > 0 && (
                    <Button variant="outline" onClick={() => setSelectedUsers([])}>
                      Clear Selection
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <input
                            type="checkbox"
                            checked={selectedUsers.length === users.length && users.length > 0}
                            onChange={toggleAllUsers}
                            className="rounded"
                          />
                        </TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Subscription</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Joined</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={selectedUsers.includes(user.id)}
                              onChange={() => toggleUserSelection(user.id)}
                              className="rounded"
                            />
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{user.full_name || 'Unknown'}</p>
                              <p className="text-sm text-muted-foreground">{user.email}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              <div className="flex items-center gap-1">
                                {getRoleIcon(user.role)}
                                {user.role}
                              </div>
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              <div className="flex items-center gap-1">
                                {getSubscriptionIcon(user.subscription_tier)}
                                {user.subscription_tier}
                              </div>
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={user.is_active ? 'default' : 'secondary'}>
                              {user.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {format(new Date(user.created_at), 'MMM d, yyyy')}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="actions" className="space-y-6">
            <div className="text-center py-4">
              <p className="text-muted-foreground">
                {selectedUsers.length} users selected for bulk actions
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setEmailAction(true)}>
                <CardHeader className="text-center">
                  <Mail className="h-8 w-8 mx-auto text-blue-500" />
                  <CardTitle className="text-lg">Send Email</CardTitle>
                  <CardDescription>Send bulk email to selected users</CardDescription>
                </CardHeader>
              </Card>

              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setBulkUpdateAction(true)}>
                <CardHeader className="text-center">
                  <RefreshCw className="h-8 w-8 mx-auto text-green-500" />
                  <CardTitle className="text-lg">Bulk Update</CardTitle>
                  <CardDescription>Update roles, subscriptions, or status</CardDescription>
                </CardHeader>
              </Card>

              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={handleExportUsers}>
                <CardHeader className="text-center">
                  <Download className="h-8 w-8 mx-auto text-purple-500" />
                  <CardTitle className="text-lg">Export Data</CardTitle>
                  <CardDescription>Export selected users to JSON</CardDescription>
                </CardHeader>
              </Card>

              <Card className="cursor-pointer hover:shadow-md transition-shadow opacity-50">
                <CardHeader className="text-center">
                  <Upload className="h-8 w-8 mx-auto text-orange-500" />
                  <CardTitle className="text-lg">Import Data</CardTitle>
                  <CardDescription>Coming soon</CardDescription>
                </CardHeader>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Action History</CardTitle>
                <CardDescription>Recent bulk actions performed</CardDescription>
              </CardHeader>
              <CardContent>
                {bulkActions.length > 0 ? (
                  <div className="space-y-4">
                    {bulkActions.map((action) => (
                      <div key={action.id} className="flex items-center gap-4 p-4 border rounded-lg">
                        <div className="flex items-center gap-2">
                          {getActionIcon(action.type)}
                          <span className="font-medium capitalize">{action.type.replace('_', ' ')}</span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={getActionStatusColor(action.status)}>
                              {action.status}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {action.processed_count} / {action.target_count} users
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(action.created_at), 'MMM d, yyyy')}
                          </p>
                          {action.completed_at && (
                            <p className="text-xs text-muted-foreground">
                              Completed {format(new Date(action.completed_at), 'HH:mm')}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No bulk actions performed yet</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Email Dialog */}
      <Dialog open={emailAction} onOpenChange={setEmailAction}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Send Bulk Email</DialogTitle>
            <DialogDescription>
              Send email to {selectedUsers.length} selected users
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email-subject">Subject</Label>
              <Input
                id="email-subject"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                placeholder="Email subject"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email-content">Message</Label>
              <Textarea
                id="email-content"
                value={emailContent}
                onChange={(e) => setEmailContent(e.target.value)}
                placeholder="Email content"
                rows={8}
              />
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Important</p>
                  <p className="text-sm text-muted-foreground">
                    This will send an email to {selectedUsers.length} users. Make sure your message is appropriate and follows your email policies.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailAction(false)}>
              Cancel
            </Button>
            <Button onClick={handleBulkEmail} disabled={selectedUsers.length === 0}>
              <Send className="h-4 w-4 mr-2" />
              Send Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Update Dialog */}
      <Dialog open={bulkUpdateAction} onOpenChange={setBulkUpdateAction}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Update Users</DialogTitle>
            <DialogDescription>
              Update {selectedUsers.length} selected users
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Update Type</Label>
              <Select
                value={updateType}
                onValueChange={(value: 'role' | 'subscription' | 'status') => setUpdateType(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="role">User Role</SelectItem>
                  <SelectItem value="subscription">Subscription Tier</SelectItem>
                  <SelectItem value="status">Account Status</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {updateType === 'role' && (
              <div className="space-y-2">
                <Label>New Role</Label>
                <Select
                  value={newRole}
                  onValueChange={(value: 'reader' | 'admin') => setNewRole(value)}
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
            )}

            {updateType === 'subscription' && (
              <div className="space-y-2">
                <Label>New Subscription Tier</Label>
                <Select
                  value={newSubscription}
                  onValueChange={(value: 'free' | 'reader' | 'pro') => setNewSubscription(value)}
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
            )}

            {updateType === 'status' && (
              <div className="space-y-2">
                <Label>New Status</Label>
                <Select
                  value={newStatus ? 'active' : 'inactive'}
                  onValueChange={(value) => setNewStatus(value === 'active')}
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
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkUpdateAction(false)}>
              Cancel
            </Button>
            <Button onClick={handleBulkUpdate} disabled={selectedUsers.length === 0}>
              Update {selectedUsers.length} Users
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}