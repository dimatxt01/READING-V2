'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { 
  BookOpen, 
  Search, 
  Plus, 
  Edit,
  Eye
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { getBookInitials, getBookPlaceholderColor } from '@/lib/storage/utils'
import { format } from 'date-fns'
import { toast } from 'sonner'

interface Book {
  id: string
  title: string
  author: string
  cover_url?: string
  total_pages?: number
  status: string
  created_at: string
  _count?: {
    exercise_texts: number
  }
}

export default function AdminBookTextsPage() {
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentUser, setCurrentUser] = useState<{id: string; role: string} | null>(null)
  
  const router = useRouter()
  const supabase = createClient()

  const checkAdminAccess = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/auth/login')
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      toast.error('You need admin privileges to access this page')
      router.push('/dashboard')
      return
    }

    setCurrentUser({
      id: profile.id,
      role: profile.role || 'reader'
    })
  }, [router, supabase])

  const fetchBooks = useCallback(async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('books')
        .select('*, exercise_texts(id)')
        .eq('status', 'approved')

      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,author.ilike.%${searchQuery}%`)
      }

      const { data, error } = await query.order('title')

      if (error) throw error
      
      const processedBooks = (data || []).map(book => {
        const exerciseTexts = (book as Record<string, unknown>).exercise_texts as Array<unknown> || []
        return {
          id: book.id,
          title: book.title,
          author: book.author,
          cover_url: book.cover_url ?? undefined,
          total_pages: book.total_pages ?? undefined,
          status: book.status || 'approved',
          created_at: book.created_at || new Date().toISOString(),
          _count: {
            exercise_texts: exerciseTexts.length
          }
        }
      })

      setBooks(processedBooks)
    } catch (error) {
      console.error('Error fetching books:', error)
      toast.error('Failed to load books')
    } finally {
      setLoading(false)
    }
  }, [searchQuery, supabase])

  useEffect(() => {
    checkAdminAccess()
    fetchBooks()
  }, [checkAdminAccess, fetchBooks])

  if (!currentUser) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-12 text-center">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
            <p>Checking admin access...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Book Text Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage exercise texts for all approved books in the library
          </p>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle>Find Books</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search by title or author..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Books Table */}
      {loading ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
            <p>Loading books...</p>
          </CardContent>
        </Card>
      ) : books.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No books found</h3>
            <p className="text-muted-foreground">
              {searchQuery ? 'Try a different search term' : 'No approved books available'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cover</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>Pages</TableHead>
                <TableHead>Exercise Texts</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {books.map((book) => (
                <TableRow key={book.id}>
                  <TableCell>
                    <div className="w-12 h-16 relative bg-muted rounded">
                      {book.cover_url ? (
                        <Image
                          src={book.cover_url}
                          alt={book.title}
                          fill
                          className="object-cover rounded"
                        />
                      ) : (
                        <div 
                          className="w-full h-full flex items-center justify-center text-xs font-bold text-white rounded"
                          style={{ backgroundColor: getBookPlaceholderColor(book.title) }}
                        >
                          {getBookInitials(book.title)}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    <div>
                      <div className="font-medium">{book.title}</div>
                      <div className="text-sm text-muted-foreground">
                        Added {format(new Date(book.created_at), 'MMM d, yyyy')}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{book.author}</TableCell>
                  <TableCell>{book.total_pages || '-'}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant={book._count?.exercise_texts ? 'default' : 'secondary'}>
                        {book._count?.exercise_texts || 0} texts
                      </Badge>
                      {book._count?.exercise_texts === 0 && (
                        <Badge variant="outline" className="text-orange-600">
                          No texts
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Link href={`/books/${book.id}`}>
                        <Button size="sm" variant="ghost" title="View Book">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Link href={`/admin/books/${book.id}/texts`}>
                        <Button size="sm" variant="ghost" title="Manage Texts">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </Link>
                      {book._count?.exercise_texts === 0 && (
                        <Link href={`/admin/books/${book.id}/texts`}>
                          <Button size="sm" variant="default" title="Add First Text">
                            <Plus className="h-4 w-4" />
                          </Button>
                        </Link>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Books</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{books.length}</div>
            <p className="text-xs text-muted-foreground">
              Approved books in library
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Books with Texts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {books.filter(b => (b._count?.exercise_texts || 0) > 0).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Books have exercise texts
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Exercise Texts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {books.reduce((sum, book) => sum + (book._count?.exercise_texts || 0), 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Exercise texts created
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}