'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
// import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import Image from 'next/image'
import { format } from 'date-fns'
import { Check, X, Eye, Merge, Loader2, Search } from 'lucide-react'
import { getBookInitials, getBookPlaceholderColor } from '@/lib/storage/utils'

interface Book {
  id: string
  title: string
  author: string
  isbn?: string
  cover_url?: string
  total_pages?: number
  genre?: string
  publication_year?: number
  status: 'pending' | 'approved' | 'merged' | 'rejected'
  merged_with_id?: string
  created_by?: string
  approved_by?: string
  approved_at?: string
  rejection_reason?: string
  created_at: string
  updated_at: string
  creator?: {
    full_name?: string
  }
}

export default function AdminBooksPage() {
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedBook, setSelectedBook] = useState<Book | null>(null)
  const [actionDialog, setActionDialog] = useState<{
    open: boolean
    type: 'approve' | 'reject' | 'merge' | null
  }>({ open: false, type: null })
  const [rejectionReason, setRejectionReason] = useState('')
  const [mergeTargetId, setMergeTargetId] = useState('')
  const [approvedBooks, setApprovedBooks] = useState<Book[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentUser, setCurrentUser] = useState<{id: string; role: string} | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalBooks, setTotalBooks] = useState(0)
  const itemsPerPage = 20
  
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    checkAdminAccess()
    fetchBooks()
    fetchApprovedBooks()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, currentPage])

  const checkAdminAccess = async () => {
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
      toast({
        title: 'Access Denied',
        description: 'You need admin privileges to access this page',
        variant: 'destructive'
      })
      router.push('/dashboard')
      return
    }

    setCurrentUser({
      id: profile.id,
      role: profile.role || 'reader'
    })
  }

  const fetchBooks = async () => {
    setLoading(true)
    try {
      // First, get the count for pagination
      let countQuery = supabase
        .from('books')
        .select('*', { count: 'exact', head: true })

      if (searchQuery) {
        countQuery = countQuery.or(`title.ilike.%${searchQuery}%,author.ilike.%${searchQuery}%`)
      }

      const { count, error: countError } = await countQuery

      if (countError) throw countError

      setTotalBooks(count || 0)
      setTotalPages(Math.ceil((count || 0) / itemsPerPage))

      // Now fetch the actual data
      let query = supabase
        .from('books')
        .select(`
          *,
          creator:profiles!books_created_by_fkey(full_name)
        `)
        // Sort to show pending first, then by created_at
        .order('status', { ascending: true })
        .order('created_at', { ascending: false })

      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,author.ilike.%${searchQuery}%`)
      }

      // Add pagination
      const from = (currentPage - 1) * itemsPerPage
      const to = from + itemsPerPage - 1
      query = query.range(from, to)

      const { data, error } = await query

      if (error) throw error

      // Sort data client-side to ensure pending books are first
      const sortedData = (data || []).sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1
        if (a.status !== 'pending' && b.status === 'pending') return 1
        const aDate = a.created_at ? new Date(a.created_at).getTime() : 0
        const bDate = b.created_at ? new Date(b.created_at).getTime() : 0
        return bDate - aDate
      })

      setBooks(sortedData.map(book => ({
        ...book,
        isbn: book.isbn ?? undefined,
        cover_url: book.cover_url ?? undefined,
        total_pages: book.total_pages ?? undefined,
        genre: book.genre ?? undefined,
        publication_year: book.publication_year ?? undefined,
        created_by: book.created_by ?? undefined,
        approved_by: book.approved_by ?? undefined,
        approved_at: book.approved_at ?? undefined,
        rejection_reason: book.rejection_reason ?? undefined,
        merged_with_id: book.merged_with_id ?? undefined,
        status: (book.status as 'pending' | 'approved' | 'merged' | 'rejected') ?? 'pending',
        created_at: book.created_at ?? new Date().toISOString(),
        updated_at: book.updated_at ?? new Date().toISOString(),
        creator: undefined
      })))
    } catch (error) {
      console.error('Error fetching books:', error)
      toast({
        title: 'Error',
        description: 'Failed to load books',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchApprovedBooks = async () => {
    try {
      const { data, error } = await supabase
        .from('books')
        .select('id, title, author')
        .eq('status', 'approved')
        .order('title')

      if (error) throw error
      setApprovedBooks((data || []).map(book => ({
        ...book,
        status: 'approved' as const,
        isbn: undefined,
        cover_url: undefined,
        total_pages: undefined,
        genre: undefined,
        publication_year: undefined,
        merged_with_id: undefined,
        created_by: undefined,
        approved_by: undefined,
        approved_at: undefined,
        rejection_reason: undefined,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })))
    } catch (error) {
      console.error('Error fetching approved books:', error)
    }
  }

  const handleApprove = async () => {
    if (!selectedBook || !currentUser) return

    setIsProcessing(true)
    try {
      const { error } = await supabase
        .from('books')
        .update({
          status: 'approved',
          approved_by: currentUser.id,
          approved_at: new Date().toISOString(),
          rejection_reason: null
        })
        .eq('id', selectedBook.id)

      if (error) throw error

      toast({
        title: 'Success',
        description: `"${selectedBook.title}" has been approved`
      })

      fetchBooks()
      setActionDialog({ open: false, type: null })
      setSelectedBook(null)
    } catch (error) {
      console.error('Error approving book:', error)
      toast({
        title: 'Error',
        description: 'Failed to approve book',
        variant: 'destructive'
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleReject = async () => {
    if (!selectedBook || !rejectionReason.trim() || !currentUser) return

    setIsProcessing(true)
    try {
      const { error } = await supabase
        .from('books')
        .update({
          status: 'rejected',
          rejection_reason: rejectionReason.trim(),
          approved_by: currentUser.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', selectedBook.id)

      if (error) throw error

      toast({
        title: 'Success',
        description: `"${selectedBook.title}" has been rejected`
      })

      fetchBooks()
      setActionDialog({ open: false, type: null })
      setSelectedBook(null)
      setRejectionReason('')
    } catch (error) {
      console.error('Error rejecting book:', error)
      toast({
        title: 'Error',
        description: 'Failed to reject book',
        variant: 'destructive'
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleMerge = async () => {
    if (!selectedBook || !mergeTargetId || !currentUser) return

    setIsProcessing(true)
    try {
      // Update all reading submissions to point to the target book
      const { error: submissionsError } = await supabase
        .from('reading_submissions')
        .update({ book_id: mergeTargetId })
        .eq('book_id', selectedBook.id)

      if (submissionsError) throw submissionsError

      // Update all reviews to point to the target book
      const { error: reviewsError } = await supabase
        .from('book_reviews')
        .update({ book_id: mergeTargetId })
        .eq('book_id', selectedBook.id)

      if (reviewsError) throw reviewsError

      // Mark the book as merged
      const { error } = await supabase
        .from('books')
        .update({
          status: 'merged',
          merged_with_id: mergeTargetId,
          approved_by: currentUser.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', selectedBook.id)

      if (error) throw error

      toast({
        title: 'Success',
        description: `"${selectedBook.title}" has been merged`
      })

      fetchBooks()
      setActionDialog({ open: false, type: null })
      setSelectedBook(null)
      setMergeTargetId('')
    } catch (error) {
      console.error('Error merging book:', error)
      toast({
        title: 'Error',
        description: 'Failed to merge book',
        variant: 'destructive'
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200">Pending Approval</Badge>
      case 'approved':
        return <Badge className="bg-green-500">Approved</Badge>
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>
      case 'merged':
        return <Badge className="bg-blue-500">Merged</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  if (!currentUser) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto" />
            <p className="mt-4">Checking admin access...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Book Management</h1>
        <p className="text-muted-foreground mt-2">
          Review and manage book submissions from the community
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Books ({totalBooks} total)</CardTitle>
            <div className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search by title or author..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setCurrentPage(1) // Reset to first page on new search
              }}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto" />
            <p className="mt-4">Loading books...</p>
          </CardContent>
        </Card>
      ) : books.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">No books found</p>
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
                <TableHead>Status</TableHead>
                <TableHead>Created By</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {books.map((book) => (
                <TableRow
                  key={book.id}
                  className={book.status === 'pending' ? 'bg-yellow-50 dark:bg-yellow-900/20' : ''}
                >
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
                  <TableCell className="font-medium">{book.title}</TableCell>
                  <TableCell>{book.author}</TableCell>
                  <TableCell>{book.total_pages || '-'}</TableCell>
                  <TableCell>{getStatusBadge(book.status)}</TableCell>
                  <TableCell>{book.creator?.full_name || 'Unknown'}</TableCell>
                  <TableCell>{format(new Date(book.created_at), 'MMM d, yyyy')}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => router.push(`/books/${book.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {book.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-green-600"
                            onClick={() => {
                              setSelectedBook(book)
                              setActionDialog({ open: true, type: 'approve' })
                            }}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600"
                            onClick={() => {
                              setSelectedBook(book)
                              setActionDialog({ open: true, type: 'reject' })
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-blue-600"
                            onClick={() => {
                              setSelectedBook(book)
                              setActionDialog({ open: true, type: 'merge' })
                            }}
                          >
                            <Merge className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-4 border-t">
              <div className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to{' '}
                {Math.min(currentPage * itemsPerPage, totalBooks)} of {totalBooks} books
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>

                {/* Page number buttons */}
                <div className="flex gap-1">
                  {[...Array(Math.min(5, totalPages))].map((_, i) => {
                    let pageNum
                    if (totalPages <= 5) {
                      pageNum = i + 1
                    } else if (currentPage <= 3) {
                      pageNum = i + 1
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i
                    } else {
                      pageNum = currentPage - 2 + i
                    }

                    return (
                      <Button
                        key={i}
                        variant={pageNum === currentPage ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className="w-10"
                      >
                        {pageNum}
                      </Button>
                    )
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Action Dialogs */}
      <Dialog open={actionDialog.open} onOpenChange={(open) => !isProcessing && setActionDialog({ open, type: actionDialog.type })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog.type === 'approve' && 'Approve Book'}
              {actionDialog.type === 'reject' && 'Reject Book'}
              {actionDialog.type === 'merge' && 'Merge Book'}
            </DialogTitle>
            <DialogDescription>
              {selectedBook && (
                <span className="font-medium">&quot;{selectedBook.title}&quot; by {selectedBook.author}</span>
              )}
            </DialogDescription>
          </DialogHeader>

          {actionDialog.type === 'approve' && (
            <div className="py-4">
              <p className="text-sm text-muted-foreground">
                This book will be approved and made available in the library.
              </p>
            </div>
          )}

          {actionDialog.type === 'reject' && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="reason">Rejection Reason *</Label>
                <Textarea
                  id="reason"
                  placeholder="Please provide a reason for rejection..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={4}
                  disabled={isProcessing}
                />
              </div>
            </div>
          )}

          {actionDialog.type === 'merge' && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="merge-target">Merge with Book *</Label>
                <Select value={mergeTargetId} onValueChange={setMergeTargetId} disabled={isProcessing}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a book to merge with" />
                  </SelectTrigger>
                  <SelectContent>
                    {approvedBooks
                      .filter(b => b.id !== selectedBook?.id)
                      .map((book) => (
                        <SelectItem key={book.id} value={book.id}>
                          {book.title} by {book.author}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-sm text-muted-foreground">
                All reading submissions and reviews will be transferred to the selected book.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setActionDialog({ open: false, type: null })}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            {actionDialog.type === 'approve' && (
              <Button 
                onClick={handleApprove}
                disabled={isProcessing}
                className="bg-green-600 hover:bg-green-700"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Approving...
                  </>
                ) : (
                  'Approve Book'
                )}
              </Button>
            )}
            {actionDialog.type === 'reject' && (
              <Button 
                onClick={handleReject}
                disabled={isProcessing || !rejectionReason.trim()}
                variant="destructive"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Rejecting...
                  </>
                ) : (
                  'Reject Book'
                )}
              </Button>
            )}
            {actionDialog.type === 'merge' && (
              <Button 
                onClick={handleMerge}
                disabled={isProcessing || !mergeTargetId}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Merging...
                  </>
                ) : (
                  'Merge Book'
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}