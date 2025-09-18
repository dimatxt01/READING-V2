'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BookSearch } from '@/components/books/book-search'
import { BulkSubmissionForm } from './bulk-submission-form'
import { useToast } from '@/components/ui/use-toast'
import { createClient } from '@/lib/supabase/client'
import { Calendar, Clock, BookOpen, FileText, ToggleLeft, ToggleRight } from 'lucide-react'
import { format } from 'date-fns'

interface Book {
  id: string
  title: string
  author: string
  total_pages?: number
  status?: 'pending' | 'approved' | 'merged' | 'rejected'
}

interface SubmissionFormEnhancedProps {
  onSubmitSuccess?: () => void
}

export function SubmissionFormEnhanced({ onSubmitSuccess }: SubmissionFormEnhancedProps) {
  const [mode, setMode] = useState<'single' | 'bulk'>('single')
  const [selectedBook, setSelectedBook] = useState<Book | null>(null)
  const [formData, setFormData] = useState({
    pages: '',
    timeSpent: '',
    notes: '',
    readingNow: false,
    submissionDate: format(new Date(), 'yyyy-MM-dd')
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const { toast } = useToast()
  const supabase = createClient()

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!selectedBook) {
      newErrors.book = 'Please select a book'
    }

    const pages = parseInt(formData.pages)
    if (!formData.pages || isNaN(pages)) {
      newErrors.pages = 'Pages read is required'
    } else if (pages < 1) {
      newErrors.pages = 'Pages must be at least 1'
    } else if (pages > 1000) {
      newErrors.pages = 'Daily limit is 1000 pages'
    }

    const time = parseInt(formData.timeSpent)
    if (!formData.timeSpent || isNaN(time)) {
      newErrors.timeSpent = 'Time spent is required'
    } else if (time < 1) {
      newErrors.timeSpent = 'Time must be at least 1 minute'
    } else if (time > 240) {
      newErrors.timeSpent = 'Daily limit is 4 hours (240 minutes)'
    }

    if (!formData.readingNow && !formData.submissionDate) {
      newErrors.submissionDate = 'Please select a date or check "Reading now"'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      toast({
        title: 'Validation Error',
        description: 'Please check the form for errors',
        variant: 'destructive'
      })
      return
    }

    setIsSubmitting(true)
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('User not authenticated')
      }

      const submissionData = {
        user_id: user.id,
        book_id: selectedBook!.id,
        pages_read: parseInt(formData.pages),
        time_spent: parseInt(formData.timeSpent),
        submission_date: formData.readingNow ? format(new Date(), 'yyyy-MM-dd') : formData.submissionDate,
        session_timestamp: formData.readingNow ? new Date().toISOString() : `${formData.submissionDate}T12:00:00.000Z`,
        notes: formData.notes || null,
        was_premium: false // TODO: Check user subscription
      }

      const { error } = await supabase
        .from('reading_submissions')
        .insert(submissionData)

      if (error) throw error

      // Calculate reading speed
      const pagesPerHour = Math.round((submissionData.pages_read / submissionData.time_spent) * 60)
      
      toast({
        title: 'Success!',
        description: `Submitted ${submissionData.pages_read} pages in ${submissionData.time_spent} minutes (${pagesPerHour} pages/hour)`,
      })

      // Reset form
      setSelectedBook(null)
      setFormData({
        pages: '',
        timeSpent: '',
        notes: '',
        readingNow: false,
        submissionDate: format(new Date(), 'yyyy-MM-dd')
      })
      setErrors({})

      onSubmitSuccess?.()
    } catch (error) {
      console.error('Error submitting:', error)
      toast({
        title: 'Error',
        description: 'Failed to submit reading session. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Mode Selector */}
      <div className="flex items-center justify-center gap-2 p-1 bg-muted rounded-lg max-w-xs mx-auto">
        <Button
          variant={mode === 'single' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setMode('single')}
          className="flex-1"
        >
          <FileText className="h-4 w-4 mr-2" />
          Single Entry
        </Button>
        <Button
          variant={mode === 'bulk' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setMode('bulk')}
          className="flex-1"
        >
          <Calendar className="h-4 w-4 mr-2" />
          Bulk Entry
        </Button>
      </div>

      {mode === 'single' ? (
        <Card>
          <CardHeader>
            <CardTitle>Submit Reading Session</CardTitle>
            <CardDescription>
              Track your daily reading progress
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Book Selection */}
              <div className="space-y-2">
                <Label htmlFor="book">
                  Select Book <span className="text-red-500">*</span>
                </Label>
                <BookSearch
                  onSelect={setSelectedBook}
                  selectedBook={selectedBook}
                  allowCreate={true}
                />
                {errors.book && (
                  <p className="text-sm text-red-500">{errors.book}</p>
                )}
              </div>

              {/* Pages and Time */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="pages">
                    Pages Read <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <BookOpen className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="pages"
                      type="number"
                      value={formData.pages}
                      onChange={(e) => setFormData({ ...formData, pages: e.target.value })}
                      placeholder="0"
                      min="1"
                      max="1000"
                      className={`pl-10 ${errors.pages ? 'border-red-500' : ''}`}
                      disabled={isSubmitting}
                    />
                  </div>
                  {errors.pages ? (
                    <p className="text-sm text-red-500">{errors.pages}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">Max 1000 pages per day</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timeSpent">
                    Time Spent (minutes) <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="timeSpent"
                      type="number"
                      value={formData.timeSpent}
                      onChange={(e) => setFormData({ ...formData, timeSpent: e.target.value })}
                      placeholder="0"
                      min="1"
                      max="240"
                      className={`pl-10 ${errors.timeSpent ? 'border-red-500' : ''}`}
                      disabled={isSubmitting}
                    />
                  </div>
                  {errors.timeSpent ? (
                    <p className="text-sm text-red-500">{errors.timeSpent}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">Max 4 hours (240 min) per day</p>
                  )}
                </div>
              </div>

              {/* Date Selection */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, readingNow: !formData.readingNow })}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted transition-colors"
                  >
                    {formData.readingNow ? (
                      <ToggleRight className="h-5 w-5 text-primary" />
                    ) : (
                      <ToggleLeft className="h-5 w-5 text-muted-foreground" />
                    )}
                    <span className="text-sm font-medium">
                      I&apos;m reading this now (use current timestamp)
                    </span>
                  </button>
                </div>

                {!formData.readingNow && (
                  <div className="space-y-2">
                    <Label htmlFor="submissionDate">Submission Date</Label>
                    <Input
                      id="submissionDate"
                      type="date"
                      value={formData.submissionDate}
                      onChange={(e) => setFormData({ ...formData, submissionDate: e.target.value })}
                      max={format(new Date(), 'yyyy-MM-dd')}
                      className={errors.submissionDate ? 'border-red-500' : ''}
                      disabled={isSubmitting}
                    />
                    {errors.submissionDate && (
                      <p className="text-sm text-red-500">{errors.submissionDate}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Add any notes about this reading session..."
                  rows={3}
                  disabled={isSubmitting}
                />
              </div>

              {/* Reading Speed Preview */}
              {formData.pages && formData.timeSpent && (
                <div className="bg-muted rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Reading Speed</span>
                    <Badge variant="secondary">
                      {Math.round((parseInt(formData.pages) / parseInt(formData.timeSpent)) * 60)} pages/hour
                    </Badge>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Reading Session'}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <BulkSubmissionForm onSubmitSuccess={onSubmitSuccess} />
      )}
    </div>
  )
}