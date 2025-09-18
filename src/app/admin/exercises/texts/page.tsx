'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { useToast } from '@/components/ui/use-toast'
import { 
  Plus, 
  Edit, 
  Trash2, 
  FileText,
  Book,
  Hash,
  Search,
  Filter,
  RefreshCcw,
  Copy,
  Eye
} from 'lucide-react'

interface Exercise {
  id: string
  title: string
  type: string
}

interface Book {
  id: string
  title: string
  author: string
}

interface ExerciseText {
  id: string
  exercise_id: string
  book_id: string | null
  title: string
  text_content: string
  word_count: number
  difficulty_level: string
  is_custom: boolean
  created_by: string
  created_at: string
  exercises?: Exercise
  books?: Book
}

export default function ExerciseTextsManagementPage() {
  const [texts, setTexts] = useState<ExerciseText[]>([])
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterExercise, setFilterExercise] = useState<string>('all')
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all')
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editingText, setEditingText] = useState<ExerciseText | null>(null)
  const [previewText, setPreviewText] = useState<ExerciseText | null>(null)
  
  // Form state
  const [formData, setFormData] = useState({
    exercise_id: '',
    book_id: '',
    title: '',
    text_content: '',
    difficulty_level: 'intermediate',
    is_custom: false
  })

  const { toast } = useToast()

  const fetchExercises = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/exercises')
      if (!response.ok) throw new Error('Failed to fetch exercises')
      
      const result = await response.json()
      setExercises(result.data || [])
    } catch (error) {
      console.error('Error fetching exercises:', error)
    }
  }, [])

  const fetchBooks = useCallback(async () => {
    try {
      // Use the main supabase client to fetch books
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      
      const { data, error } = await supabase
        .from('books')
        .select('id, title, author')
        .eq('status', 'approved')
        .order('title')
        .limit(100)
      
      if (!error && data) {
        setBooks(data)
      }
    } catch (error) {
      console.error('Error fetching books:', error)
    }
  }, [])

  const fetchTexts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterExercise && filterExercise !== 'all') {
        params.append('exerciseId', filterExercise)
      }
      
      const response = await fetch(`/api/admin/exercises/texts?${params}`)
      if (!response.ok) throw new Error('Failed to fetch texts')
      
      const result = await response.json()
      setTexts(result.data || [])
    } catch (error) {
      console.error('Error fetching texts:', error)
      toast({
        title: 'Error',
        description: 'Failed to fetch exercise texts',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [filterExercise, toast])

  useEffect(() => {
    fetchTexts()
    fetchExercises()
    fetchBooks()
  }, [fetchTexts, fetchExercises, fetchBooks])

  const handleCreate = async () => {
    try {
      const response = await fetch('/api/admin/exercises/texts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          book_id: formData.book_id === 'none' || !formData.book_id ? null : formData.book_id
        })
      })

      if (!response.ok) throw new Error('Failed to create text')

      const result = await response.json()
      
      toast({
        title: 'Success',
        description: 'Exercise text created successfully'
      })

      setTexts(prev => [result.data, ...prev])
      setCreateDialogOpen(false)
      resetForm()
    } catch (error) {
      console.error('Error creating text:', error)
      toast({
        title: 'Error',
        description: 'Failed to create exercise text',
        variant: 'destructive'
      })
    }
  }

  const handleUpdate = async () => {
    if (!editingText) return

    try {
      const response = await fetch(`/api/admin/exercises/texts?id=${editingText.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          book_id: formData.book_id === 'none' || !formData.book_id ? null : formData.book_id
        })
      })

      if (!response.ok) throw new Error('Failed to update text')

      const result = await response.json()
      
      toast({
        title: 'Success',
        description: 'Exercise text updated successfully'
      })

      setTexts(prev => prev.map(text => 
        text.id === editingText.id ? result.data : text
      ))
      setEditingText(null)
      resetForm()
    } catch (error) {
      console.error('Error updating text:', error)
      toast({
        title: 'Error',
        description: 'Failed to update exercise text',
        variant: 'destructive'
      })
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/exercises/texts?id=${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to delete text')

      toast({
        title: 'Success',
        description: 'Exercise text deleted successfully'
      })

      setTexts(prev => prev.filter(text => text.id !== id))
    } catch (error) {
      console.error('Error deleting text:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete exercise text',
        variant: 'destructive'
      })
    }
  }

  const resetForm = () => {
    setFormData({
      exercise_id: '',
      book_id: '',
      title: '',
      text_content: '',
      difficulty_level: 'intermediate',
      is_custom: false
    })
  }

  const openEditDialog = (text: ExerciseText) => {
    setEditingText(text)
    setFormData({
      exercise_id: text.exercise_id,
      book_id: text.book_id || '',
      title: text.title,
      text_content: text.text_content,
      difficulty_level: text.difficulty_level,
      is_custom: text.is_custom
    })
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: 'Copied',
      description: 'Text copied to clipboard'
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

  const filteredTexts = texts.filter(text => {
    const matchesSearch = text.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         text.text_content.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesDifficulty = filterDifficulty === 'all' || text.difficulty_level === filterDifficulty
    return matchesSearch && matchesDifficulty
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Exercise Texts</h1>
          <p className="text-muted-foreground">
            Manage text content for exercises
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={fetchTexts}
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
                Add Text
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Exercise Text</DialogTitle>
                <DialogDescription>
                  Add a new text for exercises
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="exercise">Exercise</Label>
                  <Select 
                    value={formData.exercise_id} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, exercise_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select an exercise" />
                    </SelectTrigger>
                    <SelectContent>
                      {exercises.map(exercise => (
                        <SelectItem key={exercise.id} value={exercise.id}>
                          {exercise.title} ({exercise.type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="book">Book (Optional)</Label>
                  <Select 
                    value={formData.book_id} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, book_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a book (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No book</SelectItem>
                      {books.map(book => (
                        <SelectItem key={book.id} value={book.id}>
                          {book.title} by {book.author}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Text title"
                  />
                </div>

                <div>
                  <Label htmlFor="text_content">Text Content</Label>
                  <Textarea
                    id="text_content"
                    value={formData.text_content}
                    onChange={(e) => setFormData(prev => ({ ...prev, text_content: e.target.value }))}
                    placeholder="Enter or paste the text content here..."
                    className="min-h-[200px] font-mono text-sm"
                  />
                  {formData.text_content && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Word count: {formData.text_content.trim().split(/\s+/).filter(Boolean).length}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="difficulty">Difficulty Level</Label>
                  <Select 
                    value={formData.difficulty_level} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, difficulty_level: value }))}
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

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is_custom"
                    checked={formData.is_custom}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_custom: e.target.checked }))}
                    className="rounded"
                  />
                  <Label htmlFor="is_custom">Custom Text (not from a book)</Label>
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
                  Create Text
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search texts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="filter-exercise">Exercise</Label>
              <Select value={filterExercise} onValueChange={setFilterExercise}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Exercises</SelectItem>
                  {exercises.map(exercise => (
                    <SelectItem key={exercise.id} value={exercise.id}>
                      {exercise.title}
                    </SelectItem>
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
          </div>
        </CardContent>
      </Card>

      {/* Text List */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredTexts.map(text => (
          <Card key={text.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    {text.title}
                  </CardTitle>
                  {text.exercises && (
                    <CardDescription className="mt-1">
                      For: {text.exercises.title}
                    </CardDescription>
                  )}
                </div>
                
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setPreviewText(text)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => openEditDialog(text)}
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
                        <AlertDialogTitle>Delete Text</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete &ldquo;{text.title}&rdquo;? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(text.id)}>
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
                <Badge className={getDifficultyColor(text.difficulty_level)}>
                  {text.difficulty_level}
                </Badge>
                
                <Badge variant="outline" className="flex items-center gap-1">
                  <Hash className="h-3 w-3" />
                  {text.word_count} words
                </Badge>
                
                {text.books && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Book className="h-3 w-3" />
                    {text.books.title}
                  </Badge>
                )}
                
                {text.is_custom && (
                  <Badge variant="secondary">Custom</Badge>
                )}
              </div>

              <p className="text-sm text-muted-foreground line-clamp-3">
                {text.text_content}
              </p>

              <div className="pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => copyToClipboard(text.text_content)}
                >
                  <Copy className="h-3 w-3 mr-2" />
                  Copy Text
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Dialog */}
      {editingText && (
        <Dialog open={!!editingText} onOpenChange={() => {
          setEditingText(null)
          resetForm()
        }}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Exercise Text</DialogTitle>
              <DialogDescription>
                Update text content and settings
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-exercise">Exercise</Label>
                <Select 
                  value={formData.exercise_id} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, exercise_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {exercises.map(exercise => (
                      <SelectItem key={exercise.id} value={exercise.id}>
                        {exercise.title} ({exercise.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="edit-book">Book (Optional)</Label>
                <Select 
                  value={formData.book_id} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, book_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No book</SelectItem>
                    {books.map(book => (
                      <SelectItem key={book.id} value={book.id}>
                        {book.title} by {book.author}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="edit-title">Title</Label>
                <Input
                  id="edit-title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Text title"
                />
              </div>

              <div>
                <Label htmlFor="edit-text_content">Text Content</Label>
                <Textarea
                  id="edit-text_content"
                  value={formData.text_content}
                  onChange={(e) => setFormData(prev => ({ ...prev, text_content: e.target.value }))}
                  placeholder="Enter or paste the text content here..."
                  className="min-h-[200px] font-mono text-sm"
                />
                {formData.text_content && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Word count: {formData.text_content.trim().split(/\s+/).filter(Boolean).length}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="edit-difficulty">Difficulty Level</Label>
                <Select 
                  value={formData.difficulty_level} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, difficulty_level: value }))}
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

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="edit-is_custom"
                  checked={formData.is_custom}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_custom: e.target.checked }))}
                  className="rounded"
                />
                <Label htmlFor="edit-is_custom">Custom Text (not from a book)</Label>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setEditingText(null)
                resetForm()
              }}>
                Cancel
              </Button>
              <Button onClick={handleUpdate}>
                Update Text
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Preview Dialog */}
      {previewText && (
        <Dialog open={!!previewText} onOpenChange={() => setPreviewText(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{previewText.title}</DialogTitle>
              <DialogDescription>
                {previewText.exercises?.title} • {previewText.word_count} words • {previewText.difficulty_level}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <pre className="whitespace-pre-wrap font-serif text-sm">
                  {previewText.text_content}
                </pre>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => copyToClipboard(previewText.text_content)}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Text
                </Button>
                <Button onClick={() => setPreviewText(null)}>
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Empty State */}
      {!loading && filteredTexts.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {searchQuery || filterExercise !== 'all' || filterDifficulty !== 'all' 
                ? 'No texts found matching your filters' 
                : 'No exercise texts found. Create your first text to get started.'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}