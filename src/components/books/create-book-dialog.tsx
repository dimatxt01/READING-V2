'use client'

import { useState, useEffect } from 'react'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ImageUploader } from '@/components/ui/image-uploader'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/use-toast'
import { uploadBookCover } from '@/lib/storage/utils'
import { Loader2 } from 'lucide-react'

interface Book {
  id: string
  title: string
  author: string
  isbn?: string
  cover_url?: string
  total_pages?: number
  genre?: string
  publication_year?: number
  status?: 'pending' | 'approved' | 'merged' | 'rejected'
}

interface CreateBookDialogProps {
  open: boolean
  onClose: () => void
  onCreated: (book: Book) => void
  initialTitle?: string
}

export function CreateBookDialog({ 
  open, 
  onClose, 
  onCreated,
  initialTitle = ''
}: CreateBookDialogProps) {
  const [formData, setFormData] = useState({
    title: initialTitle,
    author: '',
    total_pages: ''
  })
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  // Update title when initialTitle changes
  useEffect(() => {
    if (initialTitle) {
      setFormData(prev => ({ ...prev, title: initialTitle }))
    }
  }, [initialTitle])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.title.trim() || !formData.author.trim()) {
      toast({
        title: 'Error',
        description: 'Title and author are required',
        variant: 'destructive'
      })
      return
    }

    setIsSubmitting(true)
    
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('User not authenticated')
      }

      let coverUrl: string | null = null

      // Upload cover image if provided
      if (coverFile) {
        const uploadResult = await uploadBookCover(coverFile)
        if (!uploadResult.success) {
          throw new Error(uploadResult.error || 'Failed to upload cover image')
        }
        coverUrl = uploadResult.url || null
      }

      // Create book
      const { data, error } = await supabase
        .from('books')
        .insert({
          title: formData.title.trim(),
          author: formData.author.trim(),
          isbn: null,
          total_pages: formData.total_pages ? parseInt(formData.total_pages) : null,
          genre: null,
          publication_year: null,
          cover_url: coverUrl,
          status: 'pending', // Books start as pending and need admin approval
          created_by: user.id
        })
        .select()
        .single()

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Book added successfully! It will be reviewed by our team.',
      })

      onCreated({
        ...data,
        isbn: data.isbn ?? undefined,
        cover_url: data.cover_url ?? undefined,
        total_pages: data.total_pages ?? undefined,
        genre: data.genre ?? undefined,
        publication_year: data.publication_year ?? undefined,
        status: (data.status as 'pending' | 'approved' | 'merged' | 'rejected') ?? 'pending'
      })
      handleClose()
    } catch (error) {
      console.error('Error creating book:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create book. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setFormData({
      title: '',
      author: '',
      total_pages: ''
    })
    setCoverFile(null)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Book</DialogTitle>
          <DialogDescription>
            Add a book that&apos;s not in our database. It will be reviewed by our team.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="The Great Gatsby"
                required
                disabled={isSubmitting}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="author">Author *</Label>
              <Input
                id="author"
                value={formData.author}
                onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                placeholder="F. Scott Fitzgerald"
                required
                disabled={isSubmitting}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="total_pages">Total Pages (Optional)</Label>
              <Input
                id="total_pages"
                type="number"
                value={formData.total_pages}
                onChange={(e) => setFormData({ ...formData, total_pages: e.target.value })}
                placeholder="e.g., 280"
                min="1"
                max="10000"
                disabled={isSubmitting}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="cover">Book Cover (Optional)</Label>
              <ImageUploader
                onFileSelect={setCoverFile}
                onRemove={() => setCoverFile(null)}
                label="Upload Book Cover"
                disabled={isSubmitting}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Upload a cover image for the book (JPG, PNG, GIF, or WebP, max 5MB)
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Book'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}