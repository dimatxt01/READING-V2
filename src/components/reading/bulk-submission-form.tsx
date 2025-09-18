'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BookSearch } from '@/components/books/book-search'
import { useToast } from '@/components/ui/use-toast'
import { createClient } from '@/lib/supabase/client'
import { Calendar, BookOpen, Clock, BarChart3, AlertCircle } from 'lucide-react'
import { format, addDays, differenceInDays, parseISO } from 'date-fns'

interface Book {
  id: string
  title: string
  author: string
  total_pages?: number
  status?: 'pending' | 'approved' | 'merged' | 'rejected'
}

interface DailyValue {
  date: string
  pages: number
  time: number
  enabled: boolean
}

interface BulkSubmissionFormProps {
  onSubmitSuccess?: () => void
}

export function BulkSubmissionForm({ onSubmitSuccess }: BulkSubmissionFormProps) {
  const [selectedBook, setSelectedBook] = useState<Book | null>(null)
  const [startDate, setStartDate] = useState(format(addDays(new Date(), -6), 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [totalPages, setTotalPages] = useState('')
  const [totalTime, setTotalTime] = useState('')
  const [distribution, setDistribution] = useState<'even' | 'custom'>('even')
  const [dailyValues, setDailyValues] = useState<DailyValue[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const { toast } = useToast()
  const supabase = createClient()

  // Calculate daily distribution when dates or totals change
  const calculateDistribution = () => {
    if (!startDate || !endDate || !totalPages || !totalTime) return

    const start = parseISO(startDate)
    const end = parseISO(endDate)
    const days = differenceInDays(end, start) + 1

    if (days <= 0) {
      setErrors({ date: 'End date must be after start date' })
      return
    }

    const pagesPerDay = Math.floor(parseInt(totalPages) / days)
    const remainingPages = parseInt(totalPages) % days
    const timePerDay = Math.floor(parseInt(totalTime) / days)
    const remainingTime = parseInt(totalTime) % days

    const newDailyValues: DailyValue[] = []
    for (let i = 0; i < days; i++) {
      const date = format(addDays(start, i), 'yyyy-MM-dd')
      newDailyValues.push({
        date,
        pages: pagesPerDay + (i < remainingPages ? 1 : 0),
        time: timePerDay + (i < remainingTime ? 1 : 0),
        enabled: true
      })
    }

    setDailyValues(newDailyValues)
    setErrors({})
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!selectedBook) {
      newErrors.book = 'Please select a book'
    }

    const pages = parseInt(totalPages)
    if (!totalPages || isNaN(pages) || pages < 1) {
      newErrors.totalPages = 'Total pages is required'
    } else if (pages > 7000) {
      newErrors.totalPages = 'Maximum 7000 pages for bulk submission'
    }

    const time = parseInt(totalTime)
    if (!totalTime || isNaN(time) || time < 1) {
      newErrors.totalTime = 'Total time is required'
    } else if (time > 1680) {
      newErrors.totalTime = 'Maximum 28 hours for bulk submission'
    }

    if (!startDate) {
      newErrors.startDate = 'Start date is required'
    }

    if (!endDate) {
      newErrors.endDate = 'End date is required'
    }

    const start = parseISO(startDate)
    const end = parseISO(endDate)
    const days = differenceInDays(end, start) + 1

    if (days <= 0) {
      newErrors.date = 'End date must be after start date'
    } else if (days > 7) {
      newErrors.date = 'Maximum 7 days for bulk submission'
    }

    // Validate daily values don't exceed limits
    const hasInvalidDaily = dailyValues.some(day => 
      day.enabled && (day.pages > 1000 || day.time > 240)
    )
    if (hasInvalidDaily) {
      newErrors.daily = 'Daily limits: 1000 pages, 240 minutes'
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

      // Submit each day's data
      const submissions = dailyValues
        .filter(day => day.enabled && day.pages > 0 && day.time > 0)
        .map(day => ({
          user_id: user.id,
          book_id: selectedBook!.id,
          pages_read: day.pages,
          time_spent: day.time,
          submission_date: day.date,
          session_timestamp: `${day.date}T12:00:00.000Z`,
          notes: `Bulk submission for ${selectedBook!.title}`,
          was_premium: false
        }))

      const { error } = await supabase
        .from('reading_submissions')
        .insert(submissions)

      if (error) throw error

      toast({
        title: 'Success!',
        description: `Submitted ${submissions.length} reading sessions`,
      })

      // Reset form
      setSelectedBook(null)
      setTotalPages('')
      setTotalTime('')
      setDailyValues([])
      setErrors({})

      onSubmitSuccess?.()
    } catch (error) {
      console.error('Error submitting:', error)
      toast({
        title: 'Error',
        description: 'Failed to submit reading sessions. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleDayEnabled = (index: number) => {
    const newValues = [...dailyValues]
    newValues[index].enabled = !newValues[index].enabled
    setDailyValues(newValues)
  }

  const updateDayValue = (index: number, field: 'pages' | 'time', value: string) => {
    const newValues = [...dailyValues]
    newValues[index][field] = parseInt(value) || 0
    setDailyValues(newValues)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bulk Reading Submission</CardTitle>
        <CardDescription>
          Submit multiple days of reading at once (max 7 days)
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

          {/* Date Range */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                max={format(new Date(), 'yyyy-MM-dd')}
                className={errors.startDate || errors.date ? 'border-red-500' : ''}
                disabled={isSubmitting}
              />
              {errors.startDate && (
                <p className="text-sm text-red-500">{errors.startDate}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                max={format(new Date(), 'yyyy-MM-dd')}
                className={errors.endDate || errors.date ? 'border-red-500' : ''}
                disabled={isSubmitting}
              />
              {errors.endDate && (
                <p className="text-sm text-red-500">{errors.endDate}</p>
              )}
            </div>
          </div>
          {errors.date && (
            <p className="text-sm text-red-500">{errors.date}</p>
          )}

          {/* Total Values */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="totalPages">
                Total Pages <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <BookOpen className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="totalPages"
                  type="number"
                  value={totalPages}
                  onChange={(e) => setTotalPages(e.target.value)}
                  placeholder="0"
                  min="1"
                  max="7000"
                  className={`pl-10 ${errors.totalPages ? 'border-red-500' : ''}`}
                  disabled={isSubmitting}
                />
              </div>
              {errors.totalPages && (
                <p className="text-sm text-red-500">{errors.totalPages}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="totalTime">
                Total Time (minutes) <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="totalTime"
                  type="number"
                  value={totalTime}
                  onChange={(e) => setTotalTime(e.target.value)}
                  placeholder="0"
                  min="1"
                  max="1680"
                  className={`pl-10 ${errors.totalTime ? 'border-red-500' : ''}`}
                  disabled={isSubmitting}
                />
              </div>
              {errors.totalTime && (
                <p className="text-sm text-red-500">{errors.totalTime}</p>
              )}
            </div>
          </div>

          {/* Distribution Method */}
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Button
                type="button"
                variant={distribution === 'even' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setDistribution('even')
                  calculateDistribution()
                }}
                disabled={!totalPages || !totalTime}
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Distribute Evenly
              </Button>
              <Button
                type="button"
                variant={distribution === 'custom' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setDistribution('custom')
                  calculateDistribution()
                }}
                disabled={!totalPages || !totalTime}
              >
                Custom Distribution
              </Button>
            </div>

            {errors.daily && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <p className="text-sm text-red-500">{errors.daily}</p>
              </div>
            )}
          </div>

          {/* Daily Distribution Preview */}
          {dailyValues.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Daily Distribution
              </h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {dailyValues.map((day, index) => (
                  <div 
                    key={day.date} 
                    className={`flex items-center gap-4 p-3 rounded-lg ${
                      day.enabled ? 'bg-muted' : 'bg-muted/50 opacity-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={day.enabled}
                      onChange={() => toggleDayEnabled(index)}
                      className="h-4 w-4 rounded"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {format(parseISO(day.date), 'EEE, MMM d')}
                      </p>
                    </div>
                    {distribution === 'custom' && day.enabled ? (
                      <>
                        <Input
                          type="number"
                          value={day.pages}
                          onChange={(e) => updateDayValue(index, 'pages', e.target.value)}
                          className="w-24"
                          min="0"
                          max="1000"
                          disabled={!day.enabled}
                        />
                        <span className="text-sm text-muted-foreground">pages</span>
                        <Input
                          type="number"
                          value={day.time}
                          onChange={(e) => updateDayValue(index, 'time', e.target.value)}
                          className="w-24"
                          min="0"
                          max="240"
                          disabled={!day.enabled}
                        />
                        <span className="text-sm text-muted-foreground">min</span>
                      </>
                    ) : (
                      <>
                        <Badge variant="secondary">{day.pages} pages</Badge>
                        <Badge variant="secondary">{day.time} min</Badge>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Submit Button */}
          <Button 
            type="submit" 
            className="w-full" 
            disabled={isSubmitting || dailyValues.length === 0}
          >
            {isSubmitting ? 'Submitting...' : `Submit ${dailyValues.filter(d => d.enabled).length} Sessions`}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}