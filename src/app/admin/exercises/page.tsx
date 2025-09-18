'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { useToast } from '@/components/ui/use-toast'
import { 
  Plus, 
  Edit, 
  Trash2, 
  Dumbbell, 
  Tag,
  Activity,
  CreditCard,
  Search,
  Filter,
  RefreshCcw,
  CheckCircle,
  XCircle
} from 'lucide-react'

interface Exercise {
  id: string
  title: string
  type: string
  difficulty: string
  description: string
  tags: string[]
  requires_subscription: boolean
  min_subscription_tier: string
  instructions: Record<string, unknown> | null
  config: Record<string, unknown>
  is_active: boolean
  created_at: string
  updated_at: string
}

export default function ExerciseManagementPage() {
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all')
  const [showInactive, setShowInactive] = useState(false)
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null)
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    type: '',
    difficulty: 'beginner',
    description: '',
    tags: '',
    requires_subscription: false,
    min_subscription_tier: 'free',
    instructions: '',
    config: '',
    is_active: true
  })

  const { toast } = useToast()

  const fetchExercises = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (showInactive) params.append('includeInactive', 'true')
      
      const response = await fetch(`/api/admin/exercises?${params}`)
      if (!response.ok) throw new Error('Failed to fetch exercises')
      
      const result = await response.json()
      setExercises(result.data || [])
    } catch (error) {
      console.error('Error fetching exercises:', error)
      toast({
        title: 'Error',
        description: 'Failed to fetch exercises',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [showInactive, toast])

  useEffect(() => {
    fetchExercises()
  }, [fetchExercises])

  const handleCreate = async () => {
    try {
      const response = await fetch('/api/admin/exercises', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
          instructions: formData.instructions ? JSON.parse(formData.instructions) : null,
          config: formData.config ? JSON.parse(formData.config) : {}
        })
      })

      if (!response.ok) throw new Error('Failed to create exercise')

      const result = await response.json()
      
      toast({
        title: 'Success',
        description: 'Exercise created successfully'
      })

      setExercises(prev => [result.data, ...prev])
      setCreateDialogOpen(false)
      resetForm()
    } catch (error) {
      console.error('Error creating exercise:', error)
      toast({
        title: 'Error',
        description: error instanceof SyntaxError ? 'Invalid JSON in instructions or config' : 'Failed to create exercise',
        variant: 'destructive'
      })
    }
  }

  const handleUpdate = async () => {
    if (!editingExercise) return

    try {
      const response = await fetch(`/api/admin/exercises/${editingExercise.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
          instructions: formData.instructions ? JSON.parse(formData.instructions) : null,
          config: formData.config ? JSON.parse(formData.config) : {}
        })
      })

      if (!response.ok) throw new Error('Failed to update exercise')

      const result = await response.json()
      
      toast({
        title: 'Success',
        description: 'Exercise updated successfully'
      })

      setExercises(prev => prev.map(ex => 
        ex.id === editingExercise.id ? result.data : ex
      ))
      setEditingExercise(null)
      resetForm()
    } catch (error) {
      console.error('Error updating exercise:', error)
      toast({
        title: 'Error',
        description: error instanceof SyntaxError ? 'Invalid JSON in instructions or config' : 'Failed to update exercise',
        variant: 'destructive'
      })
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/exercises/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to delete exercise')

      toast({
        title: 'Success',
        description: 'Exercise deleted successfully'
      })

      setExercises(prev => prev.filter(ex => ex.id !== id))
    } catch (error) {
      console.error('Error deleting exercise:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete exercise',
        variant: 'destructive'
      })
    }
  }

  const handleToggleActive = async (exercise: Exercise) => {
    try {
      const response = await fetch(`/api/admin/exercises/${exercise.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          is_active: !exercise.is_active
        })
      })

      if (!response.ok) throw new Error('Failed to toggle exercise status')

      const result = await response.json()
      
      toast({
        title: 'Success',
        description: `Exercise ${result.data.is_active ? 'activated' : 'deactivated'} successfully`
      })

      setExercises(prev => prev.map(ex => 
        ex.id === exercise.id ? result.data : ex
      ))
    } catch (error) {
      console.error('Error toggling exercise status:', error)
      toast({
        title: 'Error',
        description: 'Failed to update exercise status',
        variant: 'destructive'
      })
    }
  }

  const resetForm = () => {
    setFormData({
      title: '',
      type: '',
      difficulty: 'beginner',
      description: '',
      tags: '',
      requires_subscription: false,
      min_subscription_tier: 'free',
      instructions: '',
      config: '',
      is_active: true
    })
  }

  const openEditDialog = (exercise: Exercise) => {
    setEditingExercise(exercise)
    setFormData({
      title: exercise.title,
      type: exercise.type,
      difficulty: exercise.difficulty,
      description: exercise.description,
      tags: exercise.tags.join(', '),
      requires_subscription: exercise.requires_subscription,
      min_subscription_tier: exercise.min_subscription_tier,
      instructions: exercise.instructions ? JSON.stringify(exercise.instructions, null, 2) : '',
      config: exercise.config ? JSON.stringify(exercise.config, null, 2) : '',
      is_active: exercise.is_active
    })
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800'
      case 'intermediate': return 'bg-yellow-100 text-yellow-800'
      case 'advanced': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
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

  const filteredExercises = exercises.filter(exercise => {
    const matchesSearch = exercise.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         exercise.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = filterType === 'all' || exercise.type === filterType
    const matchesDifficulty = filterDifficulty === 'all' || exercise.difficulty === filterDifficulty
    return matchesSearch && matchesType && matchesDifficulty
  })

  const exerciseTypes = [...new Set(exercises.map(ex => ex.type))]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Exercise Management</h1>
          <p className="text-muted-foreground">
            Configure exercises, subscription requirements, and settings
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={fetchExercises}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Exercise
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Exercise</DialogTitle>
                <DialogDescription>
                  Add a new exercise to the system
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Exercise title"
                  />
                </div>

                <div>
                  <Label htmlFor="type">Type</Label>
                  <Input
                    id="type"
                    value={formData.type}
                    onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                    placeholder="e.g., word_flasher, 3-2-1, mindset"
                  />
                </div>

                <div>
                  <Label htmlFor="difficulty">Difficulty</Label>
                  <Select 
                    value={formData.difficulty} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, difficulty: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Exercise description"
                  />
                </div>

                <div>
                  <Label htmlFor="tags">Tags (comma-separated)</Label>
                  <Input
                    id="tags"
                    value={formData.tags}
                    onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                    placeholder="speed, focus, comprehension"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Requires Subscription</Label>
                    <p className="text-xs text-muted-foreground">
                      Enable if this exercise requires a paid subscription
                    </p>
                  </div>
                  <Switch
                    checked={formData.requires_subscription}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, requires_subscription: checked }))}
                  />
                </div>

                <div>
                  <Label htmlFor="min_subscription_tier">Minimum Subscription Tier</Label>
                  <Select 
                    value={formData.min_subscription_tier} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, min_subscription_tier: value }))}
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

                <div>
                  <Label htmlFor="instructions">Instructions (JSON, optional)</Label>
                  <Textarea
                    id="instructions"
                    value={formData.instructions}
                    onChange={(e) => setFormData(prev => ({ ...prev, instructions: e.target.value }))}
                    placeholder='{"steps": ["Step 1", "Step 2"]}'
                    className="font-mono text-sm"
                  />
                </div>

                <div>
                  <Label htmlFor="config">Configuration (JSON, optional)</Label>
                  <Textarea
                    id="config"
                    value={formData.config}
                    onChange={(e) => setFormData(prev => ({ ...prev, config: e.target.value }))}
                    placeholder='{"defaultSpeed": 200}'
                    className="font-mono text-sm"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Active</Label>
                    <p className="text-xs text-muted-foreground">
                      Enable to make this exercise available to users
                    </p>
                  </div>
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => {
                  setCreateDialogOpen(false)
                  resetForm()
                }}>
                  Cancel
                </Button>
                <Button onClick={handleCreate}>
                  Create Exercise
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search exercises..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="filter-type">Type</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {exerciseTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="filter-difficulty">Difficulty</Label>
              <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Difficulties</SelectItem>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <div className="flex items-center space-x-2">
                <Switch
                  id="show-inactive"
                  checked={showInactive}
                  onCheckedChange={setShowInactive}
                />
                <Label htmlFor="show-inactive">Show Inactive</Label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Exercise List */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredExercises.map(exercise => (
          <Card key={exercise.id} className={`relative ${!exercise.is_active ? 'opacity-60' : ''}`}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="flex items-center gap-2">
                    <Dumbbell className="h-4 w-4" />
                    {exercise.title}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {exercise.description}
                  </CardDescription>
                </div>
                
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => openEditDialog(exercise)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="icon" variant="ghost">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Exercise</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete &ldquo;{exercise.title}&rdquo;? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(exercise.id)}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="flex items-center gap-1">
                  <Activity className="h-3 w-3" />
                  {exercise.type}
                </Badge>
                
                <Badge className={getDifficultyColor(exercise.difficulty)}>
                  {exercise.difficulty}
                </Badge>
                
                {exercise.requires_subscription && (
                  <Badge className={getTierColor(exercise.min_subscription_tier)}>
                    <CreditCard className="h-3 w-3 mr-1" />
                    {exercise.min_subscription_tier}
                  </Badge>
                )}
                
                <Badge variant={exercise.is_active ? 'default' : 'secondary'}>
                  {exercise.is_active ? (
                    <CheckCircle className="h-3 w-3 mr-1" />
                  ) : (
                    <XCircle className="h-3 w-3 mr-1" />
                  )}
                  {exercise.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>

              {exercise.tags.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap">
                  <Tag className="h-3 w-3 text-muted-foreground" />
                  {exercise.tags.map(tag => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}

              <div className="pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => handleToggleActive(exercise)}
                >
                  {exercise.is_active ? 'Deactivate' : 'Activate'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Dialog */}
      {editingExercise && (
        <Dialog open={!!editingExercise} onOpenChange={() => {
          setEditingExercise(null)
          resetForm()
        }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Exercise</DialogTitle>
              <DialogDescription>
                Update exercise settings and configuration
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-title">Title</Label>
                <Input
                  id="edit-title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Exercise title"
                />
              </div>

              <div>
                <Label htmlFor="edit-type">Type</Label>
                <Input
                  id="edit-type"
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                  placeholder="e.g., word_flasher, 3-2-1, mindset"
                />
              </div>

              <div>
                <Label htmlFor="edit-difficulty">Difficulty</Label>
                <Select 
                  value={formData.difficulty} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, difficulty: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Exercise description"
                />
              </div>

              <div>
                <Label htmlFor="edit-tags">Tags (comma-separated)</Label>
                <Input
                  id="edit-tags"
                  value={formData.tags}
                  onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                  placeholder="speed, focus, comprehension"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Requires Subscription</Label>
                  <p className="text-xs text-muted-foreground">
                    Enable if this exercise requires a paid subscription
                  </p>
                </div>
                <Switch
                  checked={formData.requires_subscription}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, requires_subscription: checked }))}
                />
              </div>

              <div>
                <Label htmlFor="edit-min_subscription_tier">Minimum Subscription Tier</Label>
                <Select 
                  value={formData.min_subscription_tier} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, min_subscription_tier: value }))}
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

              <div>
                <Label htmlFor="edit-instructions">Instructions (JSON, optional)</Label>
                <Textarea
                  id="edit-instructions"
                  value={formData.instructions}
                  onChange={(e) => setFormData(prev => ({ ...prev, instructions: e.target.value }))}
                  placeholder='{"steps": ["Step 1", "Step 2"]}'
                  className="font-mono text-sm"
                />
              </div>

              <div>
                <Label htmlFor="edit-config">Configuration (JSON, optional)</Label>
                <Textarea
                  id="edit-config"
                  value={formData.config}
                  onChange={(e) => setFormData(prev => ({ ...prev, config: e.target.value }))}
                  placeholder='{"defaultSpeed": 200}'
                  className="font-mono text-sm"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Active</Label>
                  <p className="text-xs text-muted-foreground">
                    Enable to make this exercise available to users
                  </p>
                </div>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setEditingExercise(null)
                resetForm()
              }}>
                Cancel
              </Button>
              <Button onClick={handleUpdate}>
                Update Exercise
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Empty State */}
      {!loading && filteredExercises.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Dumbbell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {searchQuery || filterType !== 'all' || filterDifficulty !== 'all' 
                ? 'No exercises found matching your filters' 
                : 'No exercises found. Create your first exercise to get started.'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}