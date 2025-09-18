'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ArrowLeft, BookOpen, Users, Clock, Star } from 'lucide-react'
import Image from 'next/image'
import { getBookInitials, getBookPlaceholderColor } from '@/lib/storage/utils'
import { BookReviewDialog } from '@/components/books/book-review-dialog'
import { formatDistanceToNow } from 'date-fns'

interface BookDetails {
  id: string
  title: string
  author: string
  isbn?: string
  cover_url?: string
  total_pages?: number
  genre?: string
  publication_year?: number
  status: string
  created_at: string
  updated_at?: string
}

interface BookStats {
  totalReaders: number
  avgPagesPerSession: number
  avgTimePerSession: number
  avgReadingSpeed: number
  totalPagesRead: number
  totalTimeSpent: number
  completionRate: number
  fastestReader?: {
    name: string
    speed: number
    avatar_url?: string
  }
}

interface Review {
  id: string
  rating: number
  review_text?: string
  created_at: string
  is_edited: boolean
  user: {
    full_name?: string
    avatar_url?: string
  }
}

interface ReadingSession {
  id: string
  user_id: string
  pages_read: number
  time_spent: number
  submission_date: string
  user: {
    full_name?: string
    avatar_url?: string
  }
}

export default function BookDetailPage() {
  const params = useParams()
  const router = useRouter()
  const bookId = params.id as string
  
  const [book, setBook] = useState<BookDetails | null>(null)
  const [stats, setStats] = useState<BookStats | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [recentSessions, setRecentSessions] = useState<ReadingSession[]>([])
  const [userReview, setUserReview] = useState<Review | null>(null)
  const [hasReadBook, setHasReadBook] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showReviewDialog, setShowReviewDialog] = useState(false)
  
  const supabase = createClient()

  const fetchBookDetails = useCallback(async () => {
    setLoading(true)
    try {
      // Fetch book details
      const { data: bookData, error: bookError } = await supabase
        .from('books')
        .select('*')
        .eq('id', bookId)
        .single()

      if (bookError) throw bookError
      setBook({
        ...bookData,
        isbn: bookData.isbn ?? undefined,
        cover_url: bookData.cover_url ?? undefined,
        total_pages: bookData.total_pages ?? undefined,
        genre: bookData.genre ?? undefined,
        publication_year: bookData.publication_year ?? undefined,
        status: bookData.status ?? 'pending',
        created_at: bookData.created_at ?? new Date().toISOString(),
        updated_at: bookData.updated_at ?? new Date().toISOString()
      })

      // Fetch reading sessions first
      const { data: sessions, error: sessionsError } = await supabase
        .from('reading_submissions')
        .select('*')
        .eq('book_id', bookId)

      if (sessionsError) throw sessionsError

      // Fetch user profiles for all unique user IDs in sessions, but only for users with activity visibility enabled
      let userProfiles: Record<string, { full_name?: string; avatar_url?: string }> = {}
      if (sessions && sessions.length > 0) {
        const userIds = [...new Set(sessions.map(s => s.user_id))]
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, privacy_settings')
          .in('id', userIds)
        
        if (profiles) {
          userProfiles = profiles.reduce((acc, profile) => {
            // Check if user has activity visibility enabled
            const privacySettings = profile.privacy_settings as Record<string, unknown>
            const activitySettings = privacySettings?.activity as Record<string, unknown>
            const showReadingHistory = activitySettings?.showReadingHistory ?? true
            
            if (showReadingHistory) {
              acc[profile.id] = {
                full_name: profile.full_name ?? "",
                avatar_url: profile.avatar_url ?? ""
              }
            }
            return acc
          }, {} as Record<string, { full_name?: string; avatar_url?: string }>)
        }
      }

      // Check if current user has read this book
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const userSessions = sessions?.filter(s => s.user_id === user.id) || []
        setHasReadBook(userSessions.length > 0)
      }

      // Calculate statistics
      if (sessions && sessions.length > 0) {
        const uniqueReaders = new Set(sessions.map(s => s.user_id)).size
        const totalPages = sessions.reduce((sum, s) => sum + s.pages_read, 0)
        const totalTime = sessions.reduce((sum, s) => sum + s.time_spent, 0)
        const avgPages = totalPages / sessions.length
        const avgTime = totalTime / sessions.length
        const avgSpeed = (avgPages / avgTime) * 60 // pages per hour

        // Find fastest reader
        const readerSpeeds = new Map<string, { speed: number, name: string, avatar?: string }>()
        sessions.forEach(s => {
          const speed = (s.pages_read / s.time_spent) * 60
          const current = readerSpeeds.get(s.user_id)
          if (!current || speed > current.speed) {
            readerSpeeds.set(s.user_id, {
              speed,
              name: userProfiles[s.user_id]?.full_name || 'Anonymous',
              avatar: userProfiles[s.user_id]?.avatar_url ?? undefined
            })
          }
        })

        let fastestReader
        let maxSpeed = 0
        readerSpeeds.forEach(reader => {
          if (reader.speed > maxSpeed) {
            maxSpeed = reader.speed
            fastestReader = {
              name: reader.name,
              speed: reader.speed,
              avatar_url: reader.avatar
            }
          }
        })

        // Calculate completion rate
        const completionRate = bookData.total_pages 
          ? (uniqueReaders / sessions.length) * 100 
          : 0

        setStats({
          totalReaders: uniqueReaders,
          avgPagesPerSession: Math.round(avgPages),
          avgTimePerSession: Math.round(avgTime),
          avgReadingSpeed: Math.round(avgSpeed),
          totalPagesRead: totalPages,
          totalTimeSpent: totalTime,
          completionRate,
          fastestReader
        })

        // Set recent sessions - only show sessions from users with activity visibility enabled
        setRecentSessions(sessions
          .filter(s => userProfiles[s.user_id]) // Only include users with visible profiles
          .slice(-10)
          .reverse()
          .map(s => ({
            ...s,
            user: {
              full_name: userProfiles[s.user_id]?.full_name ?? undefined,
              avatar_url: userProfiles[s.user_id]?.avatar_url ?? undefined
            }
          })))
      }

      // Fetch reviews first (without relation)
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('book_reviews')
        .select('*')
        .eq('book_id', bookId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (reviewsError) throw reviewsError

      // Fetch user profiles for reviews separately
      let reviewUserProfiles: Record<string, { full_name?: string; avatar_url?: string }> = {}
      if (reviewsData && reviewsData.length > 0) {
        const reviewUserIds = [...new Set(reviewsData.map(r => r.user_id))]
        const { data: reviewProfiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', reviewUserIds)
        
        if (reviewProfiles) {
          reviewUserProfiles = reviewProfiles.reduce((acc, profile) => {
            acc[profile.id] = {
              full_name: profile.full_name ?? undefined,
              avatar_url: profile.avatar_url ?? undefined
            }
            return acc
          }, {} as Record<string, { full_name?: string; avatar_url?: string }>)
        }
      }

      setReviews((reviewsData || []).filter(r => r.rating !== null).map(r => ({
        id: r.id,
        rating: r.rating!,
        review_text: r.review_text ?? undefined,
        created_at: r.created_at ?? new Date().toISOString(),
        is_edited: r.is_edited ?? false,
        user: {
          full_name: reviewUserProfiles[r.user_id]?.full_name ?? undefined,
          avatar_url: reviewUserProfiles[r.user_id]?.avatar_url ?? undefined
        }
      })))

      // Find current user's review if exists
      if (user) {
        const userReviewData = reviewsData?.find(r => r.user_id === user.id)
        if (userReviewData && userReviewData.rating !== null) {
          setUserReview({
            id: userReviewData.id,
            rating: userReviewData.rating,
            review_text: userReviewData.review_text ?? undefined,
            created_at: userReviewData.created_at ?? new Date().toISOString(),
            is_edited: userReviewData.is_edited ?? false,
            user: {
              full_name: reviewUserProfiles[userReviewData.user_id]?.full_name ?? undefined,
              avatar_url: reviewUserProfiles[userReviewData.user_id]?.avatar_url ?? undefined
            }
          })
        } else {
          setUserReview(null)
        }
      }

    } catch (error) {
      console.error('Error fetching book details:', error)
    } finally {
      setLoading(false)
    }
  }, [bookId, supabase])

  useEffect(() => {
    fetchBookDetails()
  }, [fetchBookDetails])

  const handleReviewSubmit = async (rating: number, reviewText: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    try {
      if (userReview) {
        // Update existing review
        const { error } = await supabase
          .from('book_reviews')
          .update({
            rating,
            review_text: reviewText,
            is_edited: true,
            edited_at: new Date().toISOString()
          })
          .eq('id', userReview.id)

        if (error) throw error
      } else {
        // Create new review
        const { error } = await supabase
          .from('book_reviews')
          .insert({
            book_id: bookId,
            user_id: user.id,
            rating,
            review_text: reviewText
          })

        if (error) throw error
      }

      // Refresh reviews
      fetchBookDetails()
      setShowReviewDialog(false)
    } catch (error) {
      console.error('Error submitting review:', error)
    }
  }

  const handleDeleteReview = async () => {
    if (!userReview) return

    try {
      const { error } = await supabase
        .from('book_reviews')
        .update({
          deleted_at: new Date().toISOString(),
          can_recreate_after: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
        })
        .eq('id', userReview.id)

      if (error) throw error

      setUserReview(null)
      fetchBookDetails()
    } catch (error) {
      console.error('Error deleting review:', error)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-muted rounded mb-4"></div>
          <div className="h-32 bg-muted rounded"></div>
        </div>
      </div>
    )
  }

  if (!book) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-12 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Book not found</h3>
            <p className="text-muted-foreground mb-4">
              This book doesn&apos;t exist or has been removed.
            </p>
            <Button onClick={() => router.push('/books')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Library
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const avgRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0

  return (
    <div className="container mx-auto px-4 py-8">
      <Button
        variant="ghost"
        onClick={() => router.push('/books')}
        className="mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Library
      </Button>

      <div className="grid md:grid-cols-3 gap-8">
        {/* Book Info */}
        <div className="md:col-span-1">
          <Card>
            <CardContent className="p-6">
              <div className="aspect-[3/4] relative bg-muted mb-4">
                {book.cover_url ? (
                  <Image
                    src={book.cover_url}
                    alt={book.title}
                    fill
                    className="object-cover rounded-lg"
                  />
                ) : (
                  <div 
                    className="w-full h-full flex items-center justify-center text-6xl font-bold text-white rounded-lg"
                    style={{ backgroundColor: getBookPlaceholderColor(book.title) }}
                  >
                    {getBookInitials(book.title)}
                  </div>
                )}
              </div>
              
              <h1 className="text-2xl font-bold mb-2">{book.title}</h1>
              <p className="text-muted-foreground mb-4">by {book.author}</p>
              
              {book.total_pages && (
                <Badge variant="secondary" className="mb-4">
                  {book.total_pages} pages
                </Badge>
              )}
              
              {avgRating > 0 && (
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${
                          i < Math.round(avgRating)
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm">
                    {avgRating.toFixed(1)} ({reviews.length} reviews)
                  </span>
                </div>
              )}

              {hasReadBook && (
                <Button 
                  className="w-full"
                  onClick={() => setShowReviewDialog(true)}
                >
                  {userReview ? 'Edit Your Review' : 'Write a Review'}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Statistics and Activity */}
        <div className="md:col-span-2">
          <Tabs defaultValue="stats" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="stats">Statistics</TabsTrigger>
              <TabsTrigger value="activity">Recent Activity</TabsTrigger>
              <TabsTrigger value="reviews">Reviews</TabsTrigger>
            </TabsList>

            <TabsContent value="stats" className="space-y-4">
              {stats ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">Total Readers</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{stats.totalReaders}</div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">Avg Reading Speed</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{stats.avgReadingSpeed} p/h</div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">Avg Pages/Session</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{stats.avgPagesPerSession}</div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">Avg Time/Session</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{stats.avgTimePerSession} min</div>
                      </CardContent>
                    </Card>
                  </div>

                  {stats.fastestReader && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm font-medium">Fastest Reader</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={stats.fastestReader.avatar_url} />
                            <AvatarFallback>
                              {stats.fastestReader.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{stats.fastestReader.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {Math.round(stats.fastestReader.speed)} pages/hour
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-medium">Total Progress</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Total Pages Read</span>
                          <span className="font-medium">{stats.totalPagesRead}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Total Time Spent</span>
                          <span className="font-medium">{Math.round(stats.totalTimeSpent / 60)} hours</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No reading data yet</h3>
                    <p className="text-muted-foreground">
                      Be the first to read this book!
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="activity" className="space-y-4">
              {recentSessions.length > 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Reading Sessions</CardTitle>
                    <CardDescription>Latest activity from our community</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {recentSessions.map((session) => (
                        <div key={session.id} className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={session.user?.avatar_url} />
                            <AvatarFallback>
                              {session.user?.full_name?.charAt(0) || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="text-sm font-medium">
                              {session.user?.full_name || 'Anonymous'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Read {session.pages_read} pages in {session.time_spent} minutes
                            </p>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(session.submission_date), { addSuffix: true })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No activity yet</h3>
                    <p className="text-muted-foreground">
                      Reading sessions will appear here
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="reviews" className="space-y-4">
              {reviews.length > 0 ? (
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <Card key={review.id}>
                      <CardContent className="p-6">
                        <div className="flex items-start gap-3">
                          <Avatar>
                            <AvatarImage src={review.user?.avatar_url} />
                            <AvatarFallback>
                              {review.user?.full_name?.charAt(0) || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <div>
                                <p className="font-medium">
                                  {review.user?.full_name || 'Anonymous'}
                                </p>
                                <div className="flex items-center gap-2">
                                  <div className="flex">
                                    {[...Array(5)].map((_, i) => (
                                      <Star
                                        key={i}
                                        className={`h-3 w-3 ${
                                          i < review.rating
                                            ? 'fill-yellow-400 text-yellow-400'
                                            : 'text-gray-300'
                                        }`}
                                      />
                                    ))}
                                  </div>
                                  <span className="text-xs text-muted-foreground">
                                    {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
                                    {review.is_edited && ' (edited)'}
                                  </span>
                                </div>
                              </div>
                            </div>
                            {review.review_text && (
                              <p className="text-sm">{review.review_text}</p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Star className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No reviews yet</h3>
                    <p className="text-muted-foreground">
                      {hasReadBook 
                        ? 'Be the first to review this book!' 
                        : 'Read this book to leave a review'}
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {showReviewDialog && (
        <BookReviewDialog
          open={showReviewDialog}
          onClose={() => setShowReviewDialog(false)}
          onSubmit={handleReviewSubmit}
          onDelete={handleDeleteReview}
          existingReview={userReview}
          bookTitle={book.title}
        />
      )}
    </div>
  )
}