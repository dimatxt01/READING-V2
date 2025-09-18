'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Image from 'next/image'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Search, Plus, Loader2, BookOpen } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { debounce } from 'lodash'
import { CreateBookDialog } from './create-book-dialog'

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

interface BookSearchProps {
  onSelect: (book: Book) => void
  allowCreate?: boolean
  selectedBook?: Book | null
  className?: string
}

export function BookSearch({ 
  onSelect, 
  allowCreate = true, 
  selectedBook,
  className 
}: BookSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Book[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const supabase = createClient()

  const debouncedSearch = useMemo(
    () => debounce(async (searchQuery: string) => {
      if (searchQuery.length < 2) {
        setResults([])
        return
      }
      
      setIsSearching(true)
      try {
        const { data, error } = await supabase
          .from('books')
          .select('*')
          .or(`title.ilike.%${searchQuery}%,author.ilike.%${searchQuery}%`)
          .eq('status', 'approved')
          .order('title')
          .limit(10)
        
        if (error) {
          console.error('Error searching books:', error)
          setResults([])
        } else {
          setResults((data || []).map(book => ({
            ...book,
            isbn: book.isbn ?? undefined,
            cover_url: book.cover_url ?? undefined,
            total_pages: book.total_pages ?? undefined,
            genre: book.genre ?? undefined,
            publication_year: book.publication_year ?? undefined,
            status: (book.status as 'pending' | 'approved' | 'merged' | 'rejected') ?? undefined
          })))
        }
      } finally {
        setIsSearching(false)
      }
    }, 300),
    [supabase]
  )

  useEffect(() => {
    debouncedSearch(query)
  }, [query, debouncedSearch])

  const handleSelect = useCallback((book: Book) => {
    onSelect(book)
    setQuery('')
    setIsOpen(false)
    setResults([])
  }, [onSelect])

  const handleCreateBook = useCallback((book: Book) => {
    handleSelect(book)
    setShowCreateDialog(false)
  }, [handleSelect])

  const clearSelection = useCallback(() => {
    onSelect(null as unknown as Book)
    setQuery('')
  }, [onSelect])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.book-search-container')) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (selectedBook) {
    return (
      <div className={className}>
        <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
          {selectedBook.cover_url ? (
            <Image 
              src={selectedBook.cover_url} 
              alt={selectedBook.title}
              width={48}
              height={64}
              className="w-12 h-16 object-cover rounded"
            />
          ) : (
            <div className="w-12 h-16 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800 rounded flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{selectedBook.title}</p>
            <p className="text-sm text-muted-foreground truncate">by {selectedBook.author}</p>
            {selectedBook.total_pages && (
              <Badge variant="secondary" className="mt-1">
                {selectedBook.total_pages} pages
              </Badge>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearSelection}
          >
            Change
          </Button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className={`book-search-container relative ${className}`}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setIsOpen(true)
            }}
            onFocus={() => setIsOpen(true)}
            placeholder="Search by title or author..."
            className="pl-10"
          />
        </div>
        
        {isOpen && query.length >= 2 && (
          <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-background border rounded-lg shadow-lg max-h-96 overflow-auto">
            {isSearching ? (
              <div className="p-4 text-center">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground mt-2">Searching...</p>
              </div>
            ) : results.length > 0 ? (
              <div className="py-2">
                {results.map((book) => (
                  <button
                    key={book.id}
                    type="button"
                    onClick={() => handleSelect(book)}
                    className="w-full text-left px-4 py-3 hover:bg-muted transition-colors flex items-start gap-3"
                  >
                    {book.cover_url ? (
                      <Image 
                        src={book.cover_url} 
                        alt={book.title}
                        width={40}
                        height={56}
                        className="w-10 h-14 object-cover rounded shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-14 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded shrink-0 flex items-center justify-center">
                        <BookOpen className="w-5 h-5 text-gray-500" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{book.title}</p>
                      <p className="text-sm text-muted-foreground truncate">{book.author}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {book.total_pages && (
                          <Badge variant="outline" className="text-xs">
                            {book.total_pages} pages
                          </Badge>
                        )}
                        {book.publication_year && (
                          <Badge variant="outline" className="text-xs">
                            {book.publication_year}
                          </Badge>
                        )}
                        {book.genre && (
                          <Badge variant="outline" className="text-xs">
                            {book.genre}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center">
                <p className="text-muted-foreground mb-3">No books found</p>
                {allowCreate && (
                  <>
                    <p className="text-sm text-muted-foreground mb-3">
                      Can&apos;t find &quot;{query}&quot;?
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowCreateDialog(true)
                        setIsOpen(false)
                      }}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add New Book
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <CreateBookDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onCreated={handleCreateBook}
        initialTitle={query}
      />
    </>
  )
}