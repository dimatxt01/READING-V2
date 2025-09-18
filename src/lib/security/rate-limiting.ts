import { NextRequest } from 'next/server'

// Simple in-memory rate limiter for development
// In production, use Redis or similar distributed cache
const requests = new Map<string, { count: number; resetTime: number }>()

export interface RateLimitConfig {
  maxRequests: number
  windowMs: number
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
  keyGenerator?: (req: NextRequest) => string
  onLimitReached?: (req: NextRequest) => void
}

export class RateLimiter {
  private config: RateLimitConfig

  constructor(config: RateLimitConfig) {
    this.config = {
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      keyGenerator: (req) => this.getClientIP(req),
      ...config
    }
  }

  protected getClientIP(req: NextRequest): string {
    const forwarded = req.headers.get('x-forwarded-for')
    const realIP = req.headers.get('x-real-ip')
    const cfConnectingIP = req.headers.get('cf-connecting-ip')
    
    if (forwarded) {
      return forwarded.split(',')[0].trim()
    }
    if (realIP) {
      return realIP
    }
    if (cfConnectingIP) {
      return cfConnectingIP
    }
    
    return 'unknown'
  }

  async isAllowed(req: NextRequest): Promise<{
    allowed: boolean
    limit: number
    current: number
    remaining: number
    resetTime: number
  }> {
    const key = this.config.keyGenerator!(req)
    const now = Date.now()
    
    let bucket = requests.get(key)
    
    if (!bucket || bucket.resetTime <= now) {
      bucket = {
        count: 0,
        resetTime: now + this.config.windowMs
      }
    }

    bucket.count++
    requests.set(key, bucket)

    const allowed = bucket.count <= this.config.maxRequests
    
    if (!allowed && this.config.onLimitReached) {
      this.config.onLimitReached(req)
    }

    return {
      allowed,
      limit: this.config.maxRequests,
      current: bucket.count,
      remaining: Math.max(0, this.config.maxRequests - bucket.count),
      resetTime: bucket.resetTime
    }
  }

  // Cleanup expired entries
  cleanup() {
    const now = Date.now()
    for (const [key, bucket] of requests.entries()) {
      if (bucket.resetTime <= now) {
        requests.delete(key)
      }
    }
  }
}

// Predefined rate limiters for different use cases
export const rateLimiters = {
  // General API rate limit
  api: new RateLimiter({
    maxRequests: 100,
    windowMs: 15 * 60 * 1000, // 15 minutes
    onLimitReached: (req) => {
      console.warn(`Rate limit exceeded for IP: ${req.headers.get('x-forwarded-for') || 'unknown'}`)
    }
  }),

  // Authentication endpoints (stricter)
  auth: new RateLimiter({
    maxRequests: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    onLimitReached: (req) => {
      console.warn(`Auth rate limit exceeded for IP: ${req.headers.get('x-forwarded-for') || 'unknown'}`)
    }
  }),

  // File upload endpoints
  upload: new RateLimiter({
    maxRequests: 10,
    windowMs: 60 * 60 * 1000, // 1 hour
  }),

  // Reading submissions
  submissions: new RateLimiter({
    maxRequests: 50,
    windowMs: 60 * 60 * 1000, // 1 hour
  }),

  // Exercise completions
  exercises: new RateLimiter({
    maxRequests: 30,
    windowMs: 60 * 60 * 1000, // 1 hour
  }),

  // Search endpoints
  search: new RateLimiter({
    maxRequests: 200,
    windowMs: 15 * 60 * 1000, // 15 minutes
  })
}

// Middleware function for applying rate limiting
export function withRateLimit(limiter: RateLimiter) {
  return async (req: NextRequest) => {
    const result = await limiter.isAllowed(req)
    
    if (!result.allowed) {
      return new Response(
        JSON.stringify({
          error: 'Too many requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000)
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': result.limit.toString(),
            'X-RateLimit-Remaining': result.remaining.toString(),
            'X-RateLimit-Reset': result.resetTime.toString(),
            'Retry-After': Math.ceil((result.resetTime - Date.now()) / 1000).toString()
          }
        }
      )
    }

    return null // Proceed with request
  }
}

// Advanced rate limiting with user-based keys
export class UserRateLimiter extends RateLimiter {
  constructor(config: RateLimitConfig) {
    super({
      ...config,
      keyGenerator: (req) => {
        // Try to get user ID from JWT token or session
        const authHeader = req.headers.get('authorization')
        if (authHeader) {
          try {
            // In a real implementation, decode JWT to get user ID
            const token = authHeader.replace('Bearer ', '')
            // const decoded = jwt.decode(token)
            // return decoded.sub || this.getClientIP(req)
            return token.substring(0, 10) // Simple fallback
          } catch {
            return this.getClientIP(req)
          }
        }
        return this.getClientIP(req)
      }
    })
  }
}

// Sliding window rate limiter for more accurate limiting
export class SlidingWindowRateLimiter {
  private windows = new Map<string, number[]>()
  private maxRequests: number
  private windowMs: number

  constructor(maxRequests: number, windowMs: number) {
    this.maxRequests = maxRequests
    this.windowMs = windowMs
  }

  isAllowed(key: string): boolean {
    const now = Date.now()
    const windowStart = now - this.windowMs
    
    let requests = this.windows.get(key) || []
    
    // Remove old requests outside the window
    requests = requests.filter(timestamp => timestamp > windowStart)
    
    if (requests.length >= this.maxRequests) {
      return false
    }
    
    requests.push(now)
    this.windows.set(key, requests)
    
    return true
  }

  cleanup() {
    const now = Date.now()
    const cutoff = now - this.windowMs
    
    for (const [key, requests] of this.windows.entries()) {
      const filteredRequests = requests.filter(timestamp => timestamp > cutoff)
      if (filteredRequests.length === 0) {
        this.windows.delete(key)
      } else {
        this.windows.set(key, filteredRequests)
      }
    }
  }
}

// Periodic cleanup to prevent memory leaks
setInterval(() => {
  Object.values(rateLimiters).forEach(limiter => limiter.cleanup())
}, 5 * 60 * 1000) // Cleanup every 5 minutes