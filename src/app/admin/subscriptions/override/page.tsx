'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useToast } from '@/components/ui/use-toast'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Search, User, CreditCard, Clock, CheckCircle, AlertTriangle, RefreshCcw } from 'lucide-react'

interface User {
  id: string
  full_name: string | null
  avatar_url: string | null
  subscription_tier: string
  subscription_status: string
  created_at: string
}

export default function SubscriptionOverridePage() {
  const [users, setUsers] = useState<User[]>([])
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterTier, setFilterTier] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [overriding, setOverriding] = useState(false)
  
  // Override form state
  const [newTier, setNewTier] = useState<string>('')
  const [newStatus, setNewStatus] = useState<string>('')
  const [reason, setReason] = useState('')
  const [expiresAt, setExpiresAt] = useState('')

  const { toast } = useToast()

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchQuery) params.append('search', searchQuery)
      if (filterTier) params.append('tier', filterTier)
      params.append('limit', '50')

      const response = await fetch(`/api/admin/subscriptions/override?${params}`)
      if (!response.ok) throw new Error('Failed to fetch users')
      
      const result = await response.json()
      setUsers(result.data || [])
    } catch (error) {
      console.error('Error fetching users:', error)
      toast({
        title: 'Error',
        description: 'Failed to fetch users',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [searchQuery, filterTier, toast])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const handleUserSelect = (user: User) => {
    setSelectedUser(user)
    setNewTier(user.subscription_tier)
    setNewStatus(user.subscription_status)
    setReason('')
    setExpiresAt('')
  }

  const handleOverride = async () => {
    if (!selectedUser || !newTier) return

    setOverriding(true)
    try {
      const response = await fetch('/api/admin/subscriptions/override', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: selectedUser.id,
          tier: newTier,
          status: newStatus,
          reason,
          expiresAt: expiresAt || null
        })
      })

      if (!response.ok) throw new Error('Failed to override subscription')

      const result = await response.json()
      
      toast({
        title: 'Success',
        description: result.message || 'Subscription updated successfully'
      })

      // Update the user in the list
      setUsers(prev => prev.map(user => 
        user.id === selectedUser.id 
          ? { ...user, subscription_tier: newTier, subscription_status: newStatus }
          : user
      ))

      // Update selected user
      setSelectedUser(prev => prev ? {
        ...prev,
        subscription_tier: newTier,
        subscription_status: newStatus
      } : null)

      // Reset form
      setReason('')
      setExpiresAt('')
    } catch (error) {
      console.error('Error overriding subscription:', error)
      toast({
        title: 'Error',
        description: 'Failed to update subscription',
        variant: 'destructive'
      })
    } finally {
      setOverriding(false)
    }
  }

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'free': return 'bg-gray-100 text-gray-800'
      case 'reader': return 'bg-blue-100 text-blue-800'
      case 'pro': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'inactive': return 'bg-gray-100 text-gray-800'
      case 'canceled': return 'bg-red-100 text-red-800'
      case 'past_due': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const hasChanges = selectedUser && (
    selectedUser.subscription_tier !== newTier || 
    selectedUser.subscription_status !== newStatus
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Subscription Override</h1>
          <p className="text-muted-foreground">
            Manually override user subscription tiers and status
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Select User
            </CardTitle>
            <CardDescription>
              Search and select a user to override their subscription
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search and Filters */}
            <div className="space-y-3">
              <div>
                <Label htmlFor="search">Search Users</Label>
                <Input
                  id="search"
                  placeholder="Search by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="tier-filter">Filter by Tier</Label>
                <Select value={filterTier} onValueChange={setFilterTier}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="All tiers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All tiers</SelectItem>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="reader">Reader</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={fetchUsers}
                disabled={loading}
                className="w-full flex items-center gap-2"
              >
                {loading ? (
                  <RefreshCcw className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                Search Users
              </Button>
            </div>

            {/* User List */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {users.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  {loading ? 'Loading users...' : 'No users found'}
                </p>
              ) : (
                users.map(user => (
                  <div
                    key={user.id}
                    onClick={() => handleUserSelect(user)}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50 ${
                      selectedUser?.id === user.id ? 'border-primary bg-primary/5' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatar_url || ''} />
                        <AvatarFallback>
                          {user.full_name?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {user.full_name || 'Unnamed User'}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={getTierColor(user.subscription_tier)}>
                            {user.subscription_tier}
                          </Badge>
                          <Badge variant="outline" className={getStatusColor(user.subscription_status)}>
                            {user.subscription_status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Override Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Override Subscription
            </CardTitle>
            <CardDescription>
              {selectedUser ? `Modify ${selectedUser.full_name || 'user'}'s subscription` : 'Select a user to begin'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedUser ? (
              <>
                {/* Current Status */}
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={selectedUser.avatar_url || ''} />
                      <AvatarFallback>
                        {selectedUser.full_name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{selectedUser.full_name || 'Unnamed User'}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={getTierColor(selectedUser.subscription_tier)}>
                          Current: {selectedUser.subscription_tier}
                        </Badge>
                        <Badge variant="outline" className={getStatusColor(selectedUser.subscription_status)}>
                          {selectedUser.subscription_status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Override Form */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="new-tier">New Subscription Tier</Label>
                    <Select value={newTier} onValueChange={setNewTier}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select tier" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="free">Free</SelectItem>
                        <SelectItem value="reader">Reader</SelectItem>
                        <SelectItem value="pro">Pro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="new-status">Subscription Status</Label>
                    <Select value={newStatus} onValueChange={setNewStatus}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="canceled">Canceled</SelectItem>
                        <SelectItem value="past_due">Past Due</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="reason">Reason for Override</Label>
                    <Textarea
                      id="reason"
                      placeholder="Explain why you're making this change..."
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="expires-at">Expires At (Optional)</Label>
                    <Input
                      id="expires-at"
                      type="datetime-local"
                      value={expiresAt}
                      onChange={(e) => setExpiresAt(e.target.value)}
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Leave empty for permanent override
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-4 border-t">
                  {hasChanges ? (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          disabled={!newTier || overriding}
                          className="flex items-center gap-2"
                        >
                          {overriding ? (
                            <RefreshCcw className="h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle className="h-4 w-4" />
                          )}
                          Apply Override
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-orange-500" />
                            Confirm Subscription Override
                          </AlertDialogTitle>
                          <AlertDialogDescription className="space-y-2">
                            <p>You are about to override the subscription for:</p>
                            <div className="p-3 rounded-lg bg-muted">
                              <p className="font-medium">{selectedUser.full_name || 'Unnamed User'}</p>
                              <p className="text-sm">
                                {selectedUser.subscription_tier} → {newTier}
                              </p>
                              <p className="text-sm">
                                {selectedUser.subscription_status} → {newStatus}
                              </p>
                            </div>
                            <p>This action will be logged and cannot be undone. Continue?</p>
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleOverride}>
                            Confirm Override
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  ) : (
                    <Button disabled variant="outline">
                      No Changes to Apply
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    onClick={() => {
                      setNewTier(selectedUser.subscription_tier)
                      setNewStatus(selectedUser.subscription_status)
                      setReason('')
                      setExpiresAt('')
                    }}
                  >
                    Reset
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Select a user from the list to override their subscription
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Important Notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>• All subscription overrides are logged for audit purposes</p>
            <p>• Manual overrides will be preserved even if payment integration is added later</p>
            <p>• Setting an expiration date will automatically revert the user to their previous tier when expired</p>
            <p>• Free tier users can be upgraded to any tier without payment requirements</p>
            <p>• Pro tier includes all features and bypasses all limitations</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}