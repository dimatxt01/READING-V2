'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { 
  BookOpen, 
  Plus, 
  Edit, 
  Trash2, 
  Eye,
  Copy
} from 'lucide-react'

interface Book {
  id: string
  title: string
  author: string
  cover_url?: string
}

interface ExerciseText {
  id: string
  exercise_id: string
  book_id: string
  title: string
  text_content: string
  word_count: number
  difficulty_level: string
  exercises?: {
    name: string
    slug: string
  }
}

interface Exercise {
  id: string
  name: string
  slug: string
}

export default function BookTextsPage() {
  const params = useParams()
  const bookId = params.id as string
  const [book, setBook] = useState<Book | null>(null)
  const [exerciseTexts, setExerciseTexts] = useState<ExerciseText[]>([])
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingText, setEditingText] = useState<ExerciseText | null>(null)
  const [previewText, setPreviewText] = useState<ExerciseText | null>(null)
  
  const [formData, setFormData] = useState({
    exercise_id: '',
    title: '',
    text_content: '',
    difficulty_level: 'beginner'
  })

  const supabase = createClient()

  const fetchBookData = useCallback(async () => {
    try {
      const { data: bookData, error } = await supabase
        .from('books')
        .select('id, title, author, cover_url')
        .eq('id', bookId)
        .single()

      if (error) throw error
      setBook({
        ...bookData,
        cover_url: bookData.cover_url ?? undefined
      })
    } catch (error) {
      console.error('Error fetching book:', error)
      toast.error('Failed to load book data')
    }
  }, [supabase, bookId])

  const fetchExerciseTexts = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('exercise_texts')
        .select('*')
        .eq('book_id', bookId)
        .order('created_at', { ascending: false })

      if (error) throw error
      
      // Fetch exercise details separately
      const exerciseIds = [...new Set(data?.map(t => t.exercise_id).filter((id): id is string => Boolean(id)) || [])]
      let exerciseMap: Record<string, { name: string; slug: string }> = {}
      if (exerciseIds.length > 0) {
        const { data: exerciseData } = await supabase
          .from('exercises')
          .select('id, title, type')
          .in('id', exerciseIds)
        
        if (exerciseData) {
          exerciseMap = exerciseData.reduce((acc, ex) => {
            acc[ex.id] = { name: ex.title, slug: ex.type }
            return acc
          }, {} as Record<string, { name: string; slug: string }>)
        }
      }

      const processedData = (data || []).map(item => ({
        id: item.id,
        exercise_id: item.exercise_id || '',
        book_id: item.book_id || '',
        title: item.title || '',
        text_content: item.text_content,
        word_count: item.word_count || 0,
        difficulty_level: item.difficulty_level || 'beginner',
        exercises: item.exercise_id ? exerciseMap[item.exercise_id] : undefined
      }))
      
      setExerciseTexts(processedData)
    } catch (error) {
      console.error('Error fetching exercise texts:', error)
      toast.error('Failed to load exercise texts')
    } finally {
      setLoading(false)
    }
  }, [supabase, bookId])

  const fetchExercises = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('exercises')
        .select('id, title, type')
        .eq('is_active', true)
        .order('title')

      if (error) throw error
      setExercises((data || []).map(ex => ({
        id: ex.id,
        name: ex.title,
        slug: ex.type
      })))
    } catch (error) {
      console.error('Error fetching exercises:', error)
    }
  }, [supabase])

  useEffect(() => {
    if (bookId) {
      fetchBookData()
      fetchExerciseTexts()
      fetchExercises()
    }
  }, [bookId, fetchBookData, fetchExerciseTexts, fetchExercises])

  const calculateWordCount = (text: string) => {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length
  }

  const handleSubmit = async () => {
    if (!formData.exercise_id || !formData.title || !formData.text_content) {
      toast.error('Please fill in all required fields')
      return
    }

    const wordCount = calculateWordCount(formData.text_content)
    
    try {
      const textData = {
        exercise_id: formData.exercise_id,
        book_id: bookId,
        title: formData.title,
        text_content: formData.text_content,
        word_count: wordCount,
        difficulty_level: formData.difficulty_level,
        is_custom: false
      }

      if (editingText) {
        const { error } = await supabase
          .from('exercise_texts')
          .update(textData)
          .eq('id', editingText.id)

        if (error) throw error
        toast.success('Exercise text updated successfully')
      } else {
        const { error } = await supabase
          .from('exercise_texts')
          .insert(textData)

        if (error) throw error
        toast.success('Exercise text created successfully')
      }

      setShowCreateDialog(false)
      setEditingText(null)
      setFormData({
        exercise_id: '',
        title: '',
        text_content: '',
        difficulty_level: 'beginner'
      })
      fetchExerciseTexts()
    } catch (error) {
      console.error('Error saving exercise text:', error)
      toast.error('Failed to save exercise text')
    }
  }

  const handleEdit = (text: ExerciseText) => {
    setEditingText(text)
    setFormData({
      exercise_id: text.exercise_id,
      title: text.title,
      text_content: text.text_content,
      difficulty_level: text.difficulty_level
    })
    setShowCreateDialog(true)
  }

  const handleDelete = async (textId: string) => {
    if (!confirm('Are you sure you want to delete this exercise text?')) return

    try {
      const { error } = await supabase
        .from('exercise_texts')
        .delete()
        .eq('id', textId)

      if (error) throw error
      toast.success('Exercise text deleted successfully')
      fetchExerciseTexts()
    } catch (error) {
      console.error('Error deleting exercise text:', error)
      toast.error('Failed to delete exercise text')
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success('Text copied to clipboard')
    } catch {
      toast.error('Failed to copy text')
    }
  }

  const getDifficultyBadgeColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-500'
      case 'intermediate': return 'bg-yellow-500' 
      case 'advanced': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  if (!book) {
    return <div>Loading...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Exercise Texts</h1>
          <p className="text-muted-foreground">
            Manage exercise texts for &quot;{book.title}&quot; by {book.author}
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Exercise Text
        </Button>
      </div>

      {/* Book Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            {book.cover_url && (
              <div className="w-16 h-20 relative">
                <Image 
                  src={book.cover_url} 
                  alt={book.title}
                  width={64}
                  height={80}
                  className="w-full h-full object-cover rounded"
                />
              </div>
            )}
            <div>
              <CardTitle>{book.title}</CardTitle>
              <CardDescription>by {book.author}</CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Exercise Texts List */}
      <div className="grid gap-4">
        {loading ? (
          <div>Loading exercise texts...</div>
        ) : exerciseTexts.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8">
              <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No exercise texts yet</h3>
              <p className="text-muted-foreground text-center mb-4">
                Add sample texts from this book to use in exercises
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Text
              </Button>
            </CardContent>
          </Card>
        ) : (
          exerciseTexts.map((text) => (
            <Card key={text.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <CardTitle className="text-lg">{text.title}</CardTitle>
                      <Badge className={getDifficultyBadgeColor(text.difficulty_level)}>
                        {text.difficulty_level}
                      </Badge>
                    </div>
                    <CardDescription>
                      For: {text.exercises?.name} • {text.word_count} words
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPreviewText(text)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(text.text_content)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(text)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(text.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {text.text_content}
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingText ? 'Edit Exercise Text' : 'Add Exercise Text'}
            </DialogTitle>
            <DialogDescription>
              Add a sample text from &quot;{book.title}&quot; to use in exercises
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="exercise">Exercise</Label>
              <Select
                value={formData.exercise_id}
                onValueChange={(value) => setFormData({ ...formData, exercise_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an exercise" />
                </SelectTrigger>
                <SelectContent>
                  {exercises.map((exercise) => (
                    <SelectItem key={exercise.id} value={exercise.id}>
                      {exercise.name}
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
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Chapter 1: The Beginning"
              />
            </div>

            <div>
              <Label htmlFor="difficulty">Difficulty Level</Label>
              <Select
                value={formData.difficulty_level}
                onValueChange={(value) => setFormData({ ...formData, difficulty_level: value })}
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
              <Label htmlFor="text_content">Text Content</Label>
              <Textarea
                id="text_content"
                value={formData.text_content}
                onChange={(e) => setFormData({ ...formData, text_content: e.target.value })}
                placeholder="Paste the text excerpt from the book here..."
                className="min-h-[200px] resize-y"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Word count: {calculateWordCount(formData.text_content)}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {editingText ? 'Update Text' : 'Add Text'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewText} onOpenChange={() => setPreviewText(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{previewText?.title}</DialogTitle>
            <DialogDescription>
              {previewText?.exercises?.name} • {previewText?.word_count} words • {previewText?.difficulty_level}
            </DialogDescription>
          </DialogHeader>
          <div className="prose max-w-none">
            <p className="whitespace-pre-wrap">{previewText?.text_content}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewText(null)}>
              Close
            </Button>
            <Button onClick={() => previewText && copyToClipboard(previewText.text_content)}>
              <Copy className="h-4 w-4 mr-2" />
              Copy Text
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}