'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { createClient } from '@/lib/supabase/client'
import { 
  Edit2, 
  Trash2, 
  Calendar, 
  Clock, 
  BookOpen,
  Loader2
} from 'lucide-react'
import { format, parseISO } from 'date-fns'

interface Submission {
  id: string
  book_id: string
  pages_read: number
  time_spent: number
  submission_date: string
  session_timestamp: string
  notes?: string
  was_premium: boolean
  book?: {
    title: string
    author: string
    cover_url?: string
  }
}

interface SubmissionHistoryProps {
  userId: string
  onEdit?: () => void
}

export function SubmissionHistory({ userId, onEdit }: SubmissionHistoryProps) {
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [editingSubmission, setEditingSubmission] = useState<Submission | null>(null)
  const [deletingSubmission, setDeletingSubmission] = useState<Submission | null>(null)
  const [editForm, setEditForm] = useState({ pages_read: '', time_spent: '', notes: '' })
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    fetchSubmissions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchSubmissions = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('reading_submissions')
        .select(`
          *,
          book:books(title, author, cover_url)
        `)
        .eq('user_id', userId)
        .order('submission_date', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) throw error

      setSubmissions((data || []).map(submission => {
        const bookData = submission.book as unknown as { title?: string; author?: string; cover_url?: string } | null
        return {
          ...submission,
          notes: submission.notes ?? undefined,
          was_premium: submission.was_premium ?? false,
          book: bookData ? {
            title: bookData.title || '',
            author: bookData.author || '',
            cover_url: bookData.cover_url
          } : undefined
        }
      }))
    } catch (error) {
      console.error('Error fetching submissions:', error)
      toast({
        title: 'Error',
        description: 'Failed to load submission history',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (submission: Submission) => {
    setEditingSubmission(submission)
    setEditForm({
      pages_read: submission.pages_read.toString(),
      time_spent: submission.time_spent.toString(),
      notes: submission.notes || ''
    })
  }

  const handleUpdate = async () => {
    if (!editingSubmission) return

    const pages = parseInt(editForm.pages_read)
    const time = parseInt(editForm.time_spent)

    if (pages < 1 || pages > 1000) {
      toast({
        title: 'Error',
        description: 'Pages must be between 1 and 1000',
        variant: 'destructive'
      })
      return
    }

    if (time < 1 || time > 240) {
      toast({
        title: 'Error',
        description: 'Time must be between 1 and 240 minutes',
        variant: 'destructive'
      })
      return
    }

    try {
      const { error } = await supabase
        .from('reading_submissions')
        .update({
          pages_read: pages,
          time_spent: time,
          notes: editForm.notes || null
        })
        .eq('id', editingSubmission.id)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Submission updated successfully',
      })

      setEditingSubmission(null)
      fetchSubmissions()
      onEdit?.()
    } catch (error) {
      console.error('Error updating submission:', error)
      toast({
        title: 'Error',
        description: 'Failed to update submission',
        variant: 'destructive'
      })
    }
  }

  const handleDelete = async () => {
    if (!deletingSubmission) return

    try {
      const { error } = await supabase
        .from('reading_submissions')
        .delete()
        .eq('id', deletingSubmission.id)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Submission deleted successfully',
      })

      setDeletingSubmission(null)
      fetchSubmissions()
      onEdit?.()
    } catch (error) {
      console.error('Error deleting submission:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete submission',
        variant: 'destructive'
      })
    }
  }

  const calculateReadingSpeed = (pages: number, minutes: number) => {
    return Math.round((pages / minutes) * 60)
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Reading History</CardTitle>
          <CardDescription>View and manage your reading submissions</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : submissions.length === 0 ? (
            <div className="text-center py-8">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No reading submissions found</p>
            </div>
          ) : (
            <div className="h-96 overflow-y-auto space-y-4 pr-2">
              {submissions.map((submission) => (
                <div
                  key={submission.id}
                  className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                >
                  {submission.book?.cover_url ? (
                    <Image
                      src={submission.book.cover_url}
                      alt={submission.book.title}
                      width={48}
                      height={64}
                      className="w-12 h-16 object-cover rounded"
                    />
                  ) : (
                    <div className="w-12 h-16 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded flex items-center justify-center">
                      <BookOpen className="h-6 w-6 text-gray-500" />
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium truncate">
                      {submission.book?.title || 'Unknown Book'}
                    </h4>
                    <p className="text-sm text-muted-foreground truncate">
                      {submission.book?.author || 'Unknown Author'}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(parseISO(submission.submission_date), 'MMM d, yyyy')}
                      </span>
                      <span className="flex items-center gap-1">
                        <BookOpen className="h-3 w-3" />
                        {submission.pages_read} pages
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {submission.time_spent} min
                      </span>
                      <Badge variant="secondary">
                        {calculateReadingSpeed(submission.pages_read, submission.time_spent)} p/h
                      </Badge>
                    </div>
                    {submission.notes && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                        {submission.notes}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(submission)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeletingSubmission(submission)}
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

      {/* Edit Dialog */}
      <Dialog open={!!editingSubmission} onOpenChange={() => setEditingSubmission(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Submission</DialogTitle>
            <DialogDescription>
              Update your reading submission details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-pages">Pages Read</Label>
              <Input
                id="edit-pages"
                type="number"
                value={editForm.pages_read}
                onChange={(e) => setEditForm({ ...editForm, pages_read: e.target.value })}
                min="1"
                max="1000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-time">Time Spent (minutes)</Label>
              <Input
                id="edit-time"
                type="number"
                value={editForm.time_spent}
                onChange={(e) => setEditForm({ ...editForm, time_spent: e.target.value })}
                min="1"
                max="240"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-notes">Notes</Label>
              <Input
                id="edit-notes"
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                placeholder="Optional notes..."
              />
            </div>
            {editForm.pages_read && editForm.time_spent && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm">
                  Reading Speed: {' '}
                  <Badge variant="secondary">
                    {calculateReadingSpeed(parseInt(editForm.pages_read), parseInt(editForm.time_spent))} pages/hour
                  </Badge>
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingSubmission(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate}>
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingSubmission} onOpenChange={() => setDeletingSubmission(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Submission</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this reading submission? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deletingSubmission && (
            <div className="py-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="font-medium">{deletingSubmission.book?.title}</p>
                <p className="text-sm text-muted-foreground">
                  {deletingSubmission.pages_read} pages • {deletingSubmission.time_spent} minutes
                </p>
                <p className="text-sm text-muted-foreground">
                  {format(parseISO(deletingSubmission.submission_date), 'MMM d, yyyy')}
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingSubmission(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}