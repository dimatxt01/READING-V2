'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { 
  Settings, 
  Plus, 
  Edit, 
  Trash2, 
  Flag, 
  Users, 
  Crown,
  Loader2,
  Search
} from 'lucide-react'
import { featureFlagService, type FeatureFlag, type FeatureFlagUpdate } from '@/lib/services/featureFlags'

export default function AdminFeaturesPage() {
  const [featureFlags, setFeatureFlags] = useState<FeatureFlag[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [editingFlag, setEditingFlag] = useState<FeatureFlag | null>(null)
  const [creatingFlag, setCreatingFlag] = useState(false)
  const [deletingFlag, setDeletingFlag] = useState<FeatureFlag | null>(null)
  const [newFlag, setNewFlag] = useState({
    name: '',
    description: '',
    enabled: false,
    requires_subscription: 'free' as 'free' | 'reader' | 'pro',
    metadata: '{}'
  })
  const [editForm, setEditForm] = useState({
    enabled: false,
    description: '',
    requires_subscription: 'free' as 'free' | 'reader' | 'pro',
    metadata: '{}'
  })
  const { toast } = useToast()

  useEffect(() => {
    fetchFeatureFlags()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchFeatureFlags = async () => {
    setLoading(true)
    try {
      const flags = await featureFlagService.getFeatureFlags()
      setFeatureFlags(flags)
    } catch (error) {
      console.error('Error fetching feature flags:', error)
      toast({
        title: 'Error',
        description: 'Failed to load feature flags',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleToggleFlag = async (flag: FeatureFlag) => {
    try {
      await featureFlagService.updateFeatureFlag(flag.name, {
        enabled: !flag.enabled
      })
      
      setFeatureFlags(prev => prev.map(f => 
        f.name === flag.name ? { ...f, enabled: !f.enabled } : f
      ))

      toast({
        title: 'Success',
        description: `Feature flag '${flag.name}' ${!flag.enabled ? 'enabled' : 'disabled'}`,
      })
    } catch (error) {
      console.error('Error toggling feature flag:', error)
      toast({
        title: 'Error',
        description: 'Failed to update feature flag',
        variant: 'destructive'
      })
    }
  }

  const handleEditFlag = (flag: FeatureFlag) => {
    setEditingFlag(flag)
    setEditForm({
      enabled: flag.enabled,
      description: flag.description || '',
      requires_subscription: flag.requires_subscription,
      metadata: JSON.stringify(flag.metadata, null, 2)
    })
  }

  const handleUpdateFlag = async () => {
    if (!editingFlag) return

    try {
      let metadata = {}
      try {
        metadata = JSON.parse(editForm.metadata)
      } catch {
        toast({
          title: 'Error',
          description: 'Invalid JSON in metadata field',
          variant: 'destructive'
        })
        return
      }

      const updates: FeatureFlagUpdate = {
        enabled: editForm.enabled,
        description: editForm.description,
        requires_subscription: editForm.requires_subscription,
        metadata
      }

      await featureFlagService.updateFeatureFlag(editingFlag.name, updates)
      
      setFeatureFlags(prev => prev.map(f => 
        f.name === editingFlag.name ? { ...f, ...updates } : f
      ))

      setEditingFlag(null)
      toast({
        title: 'Success',
        description: 'Feature flag updated successfully',
      })
    } catch (error) {
      console.error('Error updating feature flag:', error)
      toast({
        title: 'Error',
        description: 'Failed to update feature flag',
        variant: 'destructive'
      })
    }
  }

  const handleCreateFlag = async () => {
    try {
      let metadata = {}
      try {
        metadata = JSON.parse(newFlag.metadata)
      } catch {
        toast({
          title: 'Error',
          description: 'Invalid JSON in metadata field',
          variant: 'destructive'
        })
        return
      }

      if (!newFlag.name.trim()) {
        toast({
          title: 'Error',
          description: 'Feature flag name is required',
          variant: 'destructive'
        })
        return
      }

      await featureFlagService.createFeatureFlag({
        name: newFlag.name.trim(),
        description: newFlag.description.trim() || null,
        enabled: newFlag.enabled,
        requires_subscription: newFlag.requires_subscription,
        metadata
      })

      setCreatingFlag(false)
      setNewFlag({
        name: '',
        description: '',
        enabled: false,
        requires_subscription: 'free',
        metadata: '{}'
      })
      fetchFeatureFlags()

      toast({
        title: 'Success',
        description: 'Feature flag created successfully',
      })
    } catch (error) {
      console.error('Error creating feature flag:', error)
      toast({
        title: 'Error',
        description: 'Failed to create feature flag',
        variant: 'destructive'
      })
    }
  }

  const handleDeleteFlag = async () => {
    if (!deletingFlag) return

    try {
      await featureFlagService.deleteFeatureFlag(deletingFlag.name)
      setFeatureFlags(prev => prev.filter(f => f.name !== deletingFlag.name))
      setDeletingFlag(null)

      toast({
        title: 'Success',
        description: 'Feature flag deleted successfully',
      })
    } catch (error) {
      console.error('Error deleting feature flag:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete feature flag',
        variant: 'destructive'
      })
    }
  }

  const getSubscriptionIcon = (tier: string) => {
    switch (tier) {
      case 'pro': return <Crown className="h-4 w-4 text-yellow-500" />
      case 'reader': return <Users className="h-4 w-4 text-blue-500" />
      default: return <Flag className="h-4 w-4 text-green-500" />
    }
  }

  const getSubscriptionColor = (tier: string) => {
    switch (tier) {
      case 'pro': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
      case 'reader': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
      default: return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
    }
  }

  const filteredFlags = featureFlags.filter(flag =>
    flag.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    flag.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Feature Flags</h1>
            <p className="text-muted-foreground">Manage application feature flags and subscription requirements</p>
          </div>
          <Button onClick={() => setCreatingFlag(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Feature Flag
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Active Feature Flags</CardTitle>
                <CardDescription>Control which features are available to users</CardDescription>
              </div>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search flags..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredFlags.length === 0 ? (
              <div className="text-center py-8">
                <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {searchQuery ? 'No feature flags match your search' : 'No feature flags found'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredFlags.map((flag) => (
                  <div
                    key={flag.id}
                    className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-medium">{flag.name}</h4>
                        <Badge
                          variant={flag.enabled ? 'default' : 'secondary'}
                          className={flag.enabled ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : ''}
                        >
                          {flag.enabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                        <Badge 
                          variant="outline" 
                          className={getSubscriptionColor(flag.requires_subscription)}
                        >
                          <div className="flex items-center gap-1">
                            {getSubscriptionIcon(flag.requires_subscription)}
                            {flag.requires_subscription}
                          </div>
                        </Badge>
                      </div>
                      {flag.description && (
                        <p className="text-sm text-muted-foreground">{flag.description}</p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={flag.enabled}
                        onCheckedChange={() => handleToggleFlag(flag)}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditFlag(flag)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeletingFlag(flag)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Flag Dialog */}
      <Dialog open={creatingFlag} onOpenChange={setCreatingFlag}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Feature Flag</DialogTitle>
            <DialogDescription>
              Add a new feature flag to control application features
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-name">Flag Name</Label>
              <Input
                id="new-name"
                value={newFlag.name}
                onChange={(e) => setNewFlag({ ...newFlag, name: e.target.value })}
                placeholder="e.g., advanced_analytics"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-description">Description</Label>
              <Textarea
                id="new-description"
                value={newFlag.description}
                onChange={(e) => setNewFlag({ ...newFlag, description: e.target.value })}
                placeholder="Brief description of what this flag controls"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="new-subscription">Required Subscription</Label>
                <Select
                  value={newFlag.requires_subscription}
                  onValueChange={(value: 'free' | 'reader' | 'pro') =>
                    setNewFlag({ ...newFlag, requires_subscription: value })
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
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Switch
                    checked={newFlag.enabled}
                    onCheckedChange={(checked) => setNewFlag({ ...newFlag, enabled: checked })}
                  />
                  Enable by default
                </Label>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-metadata">Metadata (JSON)</Label>
              <Textarea
                id="new-metadata"
                value={newFlag.metadata}
                onChange={(e) => setNewFlag({ ...newFlag, metadata: e.target.value })}
                placeholder="{}"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreatingFlag(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateFlag}>
              Create Flag
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Flag Dialog */}
      <Dialog open={!!editingFlag} onOpenChange={() => setEditingFlag(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Feature Flag</DialogTitle>
            <DialogDescription>
              Update settings for &apos;{editingFlag?.name}&apos;
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                placeholder="Brief description of what this flag controls"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-subscription">Required Subscription</Label>
                <Select
                  value={editForm.requires_subscription}
                  onValueChange={(value: 'free' | 'reader' | 'pro') =>
                    setEditForm({ ...editForm, requires_subscription: value })
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
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Switch
                    checked={editForm.enabled}
                    onCheckedChange={(checked) => setEditForm({ ...editForm, enabled: checked })}
                  />
                  Enabled
                </Label>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-metadata">Metadata (JSON)</Label>
              <Textarea
                id="edit-metadata"
                value={editForm.metadata}
                onChange={(e) => setEditForm({ ...editForm, metadata: e.target.value })}
                placeholder="{}"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingFlag(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateFlag}>
              Update Flag
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingFlag} onOpenChange={() => setDeletingFlag(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Feature Flag</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the feature flag &apos;{deletingFlag?.name}&apos;? 
              This action cannot be undone and may affect application functionality.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingFlag(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteFlag}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}