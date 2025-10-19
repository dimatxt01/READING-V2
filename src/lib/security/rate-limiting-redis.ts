/**
 * Distributed Rate Limiting with Redis Support
 *
 * This implementation supports both in-memory (development) and Redis (production)
 * rate limiting to prevent connection overload in distributed deployments.
 */

import { headers } from 'next/headers';

// Rate limit configurations
export const RATE_LIMITS = {
  api: { points: 100, duration: 15 * 60 }, // 100 requests per 15 minutes
  auth: { points: 5, duration: 15 * 60 }, // 5 requests per 15 minutes
  upload: { points: 10, duration: 60 * 60 }, // 10 uploads per hour
  'reading-submissions': { points: 50, duration: 60 * 60 }, // 50 submissions per hour
  'exercise-completion': { points: 30, duration: 60 * 60 }, // 30 completions per hour
  search: { points: 200, duration: 15 * 60 }, // 200 searches per 15 minutes
} as const;

// Redis client interface
interface RedisClient {
  incr: (key: string) => Promise<number>;
  expire: (key: string, seconds: number) => Promise<void>;
  ttl: (key: string) => Promise<number>;
}

// In-memory fallback for development
class InMemoryRateLimiter {
  private store = new Map<string, { count: number; resetAt: number }>();

  async incr(key: string): Promise<number> {
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || entry.resetAt < now) {
      this.store.set(key, { count: 1, resetAt: now + 900000 }); // 15 min default
      return 1;
    }

    entry.count++;
    return entry.count;
  }

  async expire(key: string, seconds: number): Promise<void> {
    const entry = this.store.get(key);
    if (entry) {
      entry.resetAt = Date.now() + (seconds * 1000);
    }
  }

  async ttl(key: string): Promise<number> {
    const entry = this.store.get(key);
    if (!entry) return -2;

    const remaining = Math.floor((entry.resetAt - Date.now()) / 1000);
    return remaining > 0 ? remaining : -2;
  }

  // Cleanup old entries periodically
  cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.resetAt < now) {
        this.store.delete(key);
      }
    }
  }
}

// Global rate limiter instance
let rateLimiter: RedisClient | InMemoryRateLimiter;

// Initialize rate limiter based on environment
async function getRateLimiter(): Promise<RedisClient | InMemoryRateLimiter> {
  if (rateLimiter) return rateLimiter;

  // Try to use Redis if available
  if (process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL) {
    try {
      // Try Upstash Redis first (serverless-friendly)
      if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
        try {
          // @ts-expect-error - Optional dependency
          const { Redis } = await import('@upstash/redis');
          const redis = new Redis({
            url: process.env.UPSTASH_REDIS_REST_URL,
            token: process.env.UPSTASH_REDIS_REST_TOKEN,
          });
          rateLimiter = redis as unknown as RedisClient;
          console.log('Rate limiting: Using Upstash Redis');
          return rateLimiter;
        } catch {
          // Upstash Redis not available
        }
      }

      // Try regular Redis connection
      if (process.env.REDIS_URL) {
        try {
          // @ts-expect-error - Optional dependency
          const { createClient } = await import('redis');
          const client = createClient({ url: process.env.REDIS_URL });
          await client.connect();
          rateLimiter = {
            incr: async (key: string) => client.incr(key),
            expire: async (key: string, seconds: number) => { await client.expire(key, seconds); },
            ttl: async (key: string) => client.ttl(key),
          };
          console.log('Rate limiting: Using Redis');
          return rateLimiter;
        } catch {
          // Redis not available
        }
      }
    } catch (error) {
      console.warn('Failed to connect to Redis, falling back to in-memory rate limiting:', error);
    }
  }

  // Fallback to in-memory rate limiting
  console.log('Rate limiting: Using in-memory storage (not suitable for production with multiple instances)');
  rateLimiter = new InMemoryRateLimiter();

  // Cleanup old entries every 5 minutes
  if (rateLimiter instanceof InMemoryRateLimiter) {
    setInterval(() => (rateLimiter as InMemoryRateLimiter).cleanup(), 5 * 60 * 1000);
  }

  return rateLimiter;
}

// Get client identifier from request
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function getClientId(_request: Request): Promise<string> {
  const headersList = await headers();

  // Try to get real IP from various headers (for proxied requests)
  const forwardedFor = headersList.get('x-forwarded-for');
  const realIp = headersList.get('x-real-ip');
  const cfConnectingIp = headersList.get('cf-connecting-ip');

  // Use the first available IP
  const ip = cfConnectingIp || realIp || forwardedFor?.split(',')[0]?.trim() || 'unknown';

  // For authenticated requests, use user ID if available
  const userId = headersList.get('x-user-id');

  return userId ? `user:${userId}` : `ip:${ip}`;
}

// Main rate limiting function
export async function rateLimit(
  request: Request,
  type: keyof typeof RATE_LIMITS = 'api'
): Promise<{ success: boolean; remaining: number; reset: number }> {
  try {
    // Check if rate limiting is disabled
    if (process.env.RATE_LIMIT_ENABLED === 'false') {
      return { success: true, remaining: 999, reset: 0 };
    }

    const limiter = await getRateLimiter();
    const config = RATE_LIMITS[type];
    const clientId = await getClientId(request);
    const key = `rate_limit:${type}:${clientId}`;

    // Increment counter
    const count = await limiter.incr(key);

    // Set expiry on first request
    if (count === 1) {
      await limiter.expire(key, config.duration);
    }

    // Get TTL for reset time
    const ttl = await limiter.ttl(key);
    const reset = Date.now() + (ttl * 1000);

    // Calculate remaining requests
    const remaining = Math.max(0, config.points - count);

    // Check if limit exceeded
    const success = count <= config.points;

    return { success, remaining, reset };
  } catch (error) {
    console.error('Rate limiting error:', error);
    // On error, allow the request but log the issue
    return { success: true, remaining: 1, reset: Date.now() + 60000 };
  }
}

// Middleware helper for API routes
export async function withRateLimit(
  request: Request,
  handler: () => Promise<Response>,
  type: keyof typeof RATE_LIMITS = 'api'
): Promise<Response> {
  const { success, remaining, reset } = await rateLimit(request, type);

  if (!success) {
    return new Response(
      JSON.stringify({
        error: 'Too many requests',
        message: `Rate limit exceeded. Please try again later.`,
        retryAfter: Math.ceil((reset - Date.now()) / 1000),
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': String(RATE_LIMITS[type].points),
          'X-RateLimit-Remaining': String(remaining),
          'X-RateLimit-Reset': new Date(reset).toISOString(),
          'Retry-After': String(Math.ceil((reset - Date.now()) / 1000)),
        },
      }
    );
  }

  // Execute handler and add rate limit headers to response
  const response = await handler();

  // Add rate limit headers to successful responses
  response.headers.set('X-RateLimit-Limit', String(RATE_LIMITS[type].points));
  response.headers.set('X-RateLimit-Remaining', String(remaining));
  response.headers.set('X-RateLimit-Reset', new Date(reset).toISOString());

  return response;
}

// Export types
export type RateLimitResult = {
  success: boolean;
  remaining: number;
  reset: number;
};

export type RateLimitType = keyof typeof RATE_LIMITS;