'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Search, BookOpen, Users, Star, Plus } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { CreateBookDialog } from '@/components/books/create-book-dialog'
import { getBookInitials, getBookPlaceholderColor } from '@/lib/storage/utils'

interface Book {
  id: string
  title: string
  author: string
  cover_url?: string
  total_pages?: number
  status: 'pending' | 'approved' | 'merged' | 'rejected'
  _count?: {
    reading_submissions: number
    book_reviews: number
  }
  avgRating?: number
}

export default function BooksPage() {
  const [books, setBooks] = useState<Book[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const supabase = createClient()

  const fetchBooks = useCallback(async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('books')
        .select(`
          *,
          reading_submissions!inner(id, user_id),
          book_reviews(rating)
        `)
        .eq('status', 'approved')

      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,author.ilike.%${searchQuery}%`)
      }

      const { data, error } = await query

      if (error) throw error

      // Process the data to get counts and average ratings
      const processedBooks = data?.map(book => {
        const submissions = (book as Record<string, unknown>).reading_submissions as Array<{user_id?: string}> || []
        const reviews = (book as Record<string, unknown>).book_reviews as Array<{rating?: number}> || []
        const avgRating = reviews.length > 0 
          ? reviews.reduce((sum: number, r) => sum + (r.rating || 0), 0) / reviews.length
          : 0

        // Count unique readers instead of total submissions
        const uniqueReaders = new Set(submissions.map(s => s.user_id).filter(Boolean)).size

        return {
          ...book,
          cover_url: book.cover_url ?? undefined,
          total_pages: book.total_pages ?? undefined,
          status: (book.status as 'pending' | 'approved' | 'merged' | 'rejected') ?? 'approved',
          _count: {
            reading_submissions: uniqueReaders, // Now shows unique readers like detail page
            book_reviews: reviews.length
          },
          avgRating
        }
      }) || []

      // Sort by number of readers
      processedBooks.sort((a, b) => (b._count?.reading_submissions || 0) - (a._count?.reading_submissions || 0))

      setBooks(processedBooks)
    } catch (error) {
      console.error('Error fetching books:', error)
    } finally {
      setLoading(false)
    }
  }, [searchQuery, supabase])

  useEffect(() => {
    fetchBooks()
  }, [fetchBooks])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleBookCreated = (newBook: any) => {
    // Refresh the list to include the new book if it's approved
    if (newBook.status === 'approved') {
      fetchBooks()
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Book Library</h1>
          <p className="text-muted-foreground mt-2">
            Explore books from our community of readers
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Book
        </Button>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search by title or author..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <div className="aspect-[3/4] bg-muted"></div>
              <CardContent className="p-4">
                <div className="h-4 bg-muted rounded mb-2"></div>
                <div className="h-3 bg-muted rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : books.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No books found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery ? 'Try a different search term' : 'Be the first to add a book!'}
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add the First Book
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {books.map((book) => (
            <Link key={book.id} href={`/books/${book.id}`}>
              <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                <div className="aspect-[3/4] relative bg-muted m-3 rounded-lg overflow-hidden">
                  {book.cover_url ? (
                    <Image
                      src={book.cover_url}
                      alt={book.title}
                      fill
                      className="object-cover rounded-lg"
                    />
                  ) : (
                    <div 
                      className="w-full h-full flex items-center justify-center text-4xl font-bold text-white rounded-lg"
                      style={{ backgroundColor: getBookPlaceholderColor(book.title) }}
                    >
                      {getBookInitials(book.title)}
                    </div>
                  )}
                </div>
                <CardContent className="p-4">
                  <h3 className="font-semibold line-clamp-2 mb-1">{book.title}</h3>
                  <p className="text-sm text-muted-foreground mb-3">{book.author}</p>
                  
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        <span>{book._count?.reading_submissions || 0}</span>
                      </div>
                      {book.avgRating ? (
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          <span>{book.avgRating.toFixed(1)}</span>
                        </div>
                      ) : null}
                    </div>
                    {book.total_pages && (
                      <Badge variant="secondary" className="text-xs">
                        {book.total_pages}p
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <CreateBookDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onCreated={handleBookCreated}
      />
    </div>
  )
}