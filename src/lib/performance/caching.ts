import { NextRequest, NextResponse } from 'next/server'

// In-memory cache for development (use Redis for production)
const cache = new Map<string, { data: unknown; timestamp: number; ttl: number }>()

export interface CacheOptions {
  ttl?: number // Time to live in seconds
  key?: string // Custom cache key
  tags?: string[] // Cache tags for invalidation
  revalidate?: boolean // Force revalidation
}

export class ResponseCache {
  private static defaultTTL = 300 // 5 minutes default

  static set(key: string, data: unknown, ttl: number = this.defaultTTL) {
    cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl * 1000 // Convert to milliseconds
    })
  }

  static get(key: string): unknown | null {
    const item = cache.get(key)
    if (!item) return null

    const isExpired = Date.now() - item.timestamp > item.ttl
    if (isExpired) {
      cache.delete(key)
      return null
    }

    return item.data
  }

  static delete(key: string) {
    cache.delete(key)
  }

  static clear() {
    cache.clear()
  }

  static invalidateByTag(tag: string) {
    for (const [key] of cache.entries()) {
      // Simple tag-based invalidation (in production, use more sophisticated system)
      if (key.includes(tag)) {
        cache.delete(key)
      }
    }
  }

  // Generate cache key from request
  static generateKey(req: NextRequest, prefix: string = ''): string {
    const url = new URL(req.url)
    const searchParams = url.searchParams.toString()
    return `${prefix}:${url.pathname}:${searchParams}`
  }
}

// Higher-order function for caching API routes
export function withCache(
  handler: (req: NextRequest) => Promise<NextResponse>,
  options: CacheOptions = {}
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const { ttl = 300, key, revalidate = false } = options
    
    // Generate cache key
    const cacheKey = key || ResponseCache.generateKey(req, 'api')
    
    // Check cache first (unless revalidation is forced)
    if (!revalidate) {
      const cached = ResponseCache.get(cacheKey)
      if (cached) {
        const response = NextResponse.json(cached)
        response.headers.set('X-Cache', 'HIT')
        response.headers.set('Cache-Control', `public, max-age=${ttl}`)
        return response
      }
    }

    // Execute handler
    const response = await handler(req)
    
    // Cache successful responses
    if (response.ok) {
      const data = await response.clone().json()
      ResponseCache.set(cacheKey, data, ttl)
      
      response.headers.set('X-Cache', 'MISS')
      response.headers.set('Cache-Control', `public, max-age=${ttl}`)
    }

    return response
  }
}

// Middleware for setting cache headers
export function setCacheHeaders(
  response: NextResponse,
  maxAge: number = 300,
  staleWhileRevalidate: number = 60
) {
  response.headers.set(
    'Cache-Control',
    `public, max-age=${maxAge}, s-maxage=${maxAge}, stale-while-revalidate=${staleWhileRevalidate}`
  )
  return response
}

// Cache invalidation utilities
export const CacheInvalidation = {
  // Invalidate user-specific caches
  invalidateUser(userId: string) {
    ResponseCache.invalidateByTag(`user:${userId}`)
  },

  // Invalidate book-related caches
  invalidateBooks() {
    ResponseCache.invalidateByTag('books')
  },

  // Invalidate exercise caches
  invalidateExercises() {
    ResponseCache.invalidateByTag('exercises')
  },

  // Invalidate leaderboard caches
  invalidateLeaderboard() {
    ResponseCache.invalidateByTag('leaderboard')
  },

  // Invalidate all caches
  invalidateAll() {
    ResponseCache.clear()
  }
}

// React Query / SWR cache configuration
export const queryConfig = {
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      retry: 2,
    },
  },
}

// Cache warming for critical data
export class CacheWarmer {
  static async warmCriticalData() {
    try {
      // Warm frequently accessed endpoints
      const endpoints = [
        '/api/books/search?q=',
        '/api/exercises',
        '/api/leaderboard?timeRange=weekly',
      ]

      await Promise.all(
        endpoints.map(async (endpoint) => {
          try {
            const response = await fetch(endpoint)
            if (response.ok) {
              const data = await response.json()
              ResponseCache.set(endpoint, data, 600) // 10 minutes
            }
          } catch (error) {
            console.warn(`Failed to warm cache for ${endpoint}:`, error)
          }
        })
      )
    } catch (error) {
      console.error('Cache warming failed:', error)
    }
  }

  // Background refresh for critical data
  static startBackgroundRefresh() {
    // Refresh every 5 minutes
    setInterval(() => {
      this.warmCriticalData()
    }, 5 * 60 * 1000)
  }
}