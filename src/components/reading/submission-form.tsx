"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { BookSearch } from './book-search'

interface Book {
  id: string
  title: string
  author: string
  total_pages?: number | null
}

interface SubmissionFormProps {
  recentBooks: Book[]
}

export function SubmissionForm({ recentBooks }: SubmissionFormProps) {
  const [selectedBook, setSelectedBook] = useState<Book | null>(null)
  const [formData, setFormData] = useState({
    pages: '',
    timeSpent: '',
    notes: '',
    readingNow: false,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedBook) {
      alert('Please select a book')
      return
    }

    const pages = parseInt(formData.pages)
    const timeSpent = parseInt(formData.timeSpent)

    // Validate limits
    if (pages > 1000) {
      alert('Daily limit is 1000 pages')
      return
    }

    if (timeSpent > 240) {
      alert('Daily limit is 4 hours (240 minutes)')
      return
    }

    setIsSubmitting(true)
    
    try {
      // TODO: Implement submission to API
      console.log('Submitting:', {
        bookId: selectedBook.id,
        pages,
        timeSpent,
        notes: formData.notes,
        readingNow: formData.readingNow,
      })
      
      // Reset form
      setFormData({
        pages: '',
        timeSpent: '',
        notes: '',
        readingNow: false,
      })
      setSelectedBook(null)
      
      alert('Reading session submitted successfully!')
    } catch (error) {
      console.error('Error submitting:', error)
      alert('Error submitting reading session')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="book" className="text-sm font-medium mb-2 block">
          Select Book
        </label>
        <BookSearch
          recentBooks={recentBooks}
          selectedBook={selectedBook}
          onBookSelect={setSelectedBook}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="pages" className="text-sm font-medium mb-2 block">
            Pages Read
          </label>
          <Input
            id="pages"
            type="number"
            value={formData.pages}
            onChange={(e) => handleChange('pages', e.target.value)}
            placeholder="0"
            min="1"
            max="1000"
            required
          />
          <p className="text-xs text-muted-foreground mt-1">Max 1000 pages per day</p>
        </div>

        <div>
          <label htmlFor="timeSpent" className="text-sm font-medium mb-2 block">
            Time Spent (minutes)
          </label>
          <Input
            id="timeSpent"
            type="number"
            value={formData.timeSpent}
            onChange={(e) => handleChange('timeSpent', e.target.value)}
            placeholder="0"
            min="1"
            max="240"
            required
          />
          <p className="text-xs text-muted-foreground mt-1">Max 4 hours per day</p>
        </div>
      </div>

      <div>
        <label htmlFor="notes" className="text-sm font-medium mb-2 block">
          Notes (Optional)
        </label>
        <textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => handleChange('notes', e.target.value)}
          placeholder="Add any notes about this reading session..."
          className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          rows={3}
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="readingNow"
          checked={formData.readingNow}
          onChange={(e) => handleChange('readingNow', e.target.checked)}
          className="h-4 w-4 rounded border-gray-300"
        />
        <label htmlFor="readingNow" className="text-sm font-medium">
          I&apos;m reading this now (use current timestamp)
        </label>
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Submitting...' : 'Submit Reading Session'}
      </Button>
    </form>
  )
}