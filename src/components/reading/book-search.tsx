"use client"

import { useState, useRef, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface Book {
  id: string
  title: string
  author: string
  total_pages?: number | null
}

interface BookSearchProps {
  recentBooks: Book[]
  selectedBook: Book | null
  onBookSelect: (book: Book | null) => void
}

export function BookSearch({ recentBooks, selectedBook, onBookSelect }: BookSearchProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [filteredBooks, setFilteredBooks] = useState<Book[]>(recentBooks)
  const searchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (searchTerm.trim()) {
      const filtered = recentBooks.filter(book =>
        book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        book.author.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredBooks(filtered)
    } else {
      setFilteredBooks(recentBooks)
    }
  }, [searchTerm, recentBooks])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleBookSelect = (book: Book) => {
    onBookSelect(book)
    setSearchTerm('')
    setIsOpen(false)
  }

  const handleCreateNewBook = () => {
    // TODO: Implement book creation modal
    console.log('Create new book clicked')
  }

  return (
    <div ref={searchRef} className="relative">
      {selectedBook ? (
        <div className="flex items-center justify-between p-3 border rounded-md bg-muted">
          <div>
            <p className="font-medium">{selectedBook.title}</p>
            <p className="text-sm text-muted-foreground">{selectedBook.author}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onBookSelect(null)}
          >
            Change
          </Button>
        </div>
      ) : (
        <>
          <Input
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setIsOpen(true)
            }}
            onFocus={() => setIsOpen(true)}
            placeholder="Search for a book or author..."
            className="w-full"
          />

          {isOpen && (
            <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-auto">
              {filteredBooks.length > 0 ? (
                <div className="p-2">
                  {filteredBooks.map((book) => (
                    <button
                      key={book.id}
                      type="button"
                      onClick={() => handleBookSelect(book)}
                      className="w-full text-left p-2 hover:bg-muted rounded-sm"
                    >
                      <div>
                        <p className="font-medium">{book.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {book.author}
                          {book.total_pages && ` • ${book.total_pages} pages`}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : searchTerm.trim() ? (
                <div className="p-4 text-center">
                  <p className="text-muted-foreground mb-2">No books found</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCreateNewBook}
                  >
                    Create &quot;{searchTerm}&quot;
                  </Button>
                </div>
              ) : (
                <div className="p-4 text-center">
                  <p className="text-muted-foreground">Start typing to search for books</p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}