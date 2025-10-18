/**
 * Centralized application configuration
 *
 * All magic numbers and hardcoded values should be defined here
 * Environment variables are the source of truth
 */

export const config = {
  app: {
    name: 'ReadSpeed',
    domain: process.env.NEXT_PUBLIC_DOMAIN || 'coolifyai.com',
  },

  features: {
    exercisesEnabled: process.env.NEXT_PUBLIC_FEATURES_EXERCISES === 'true',
  },

  goals: {
    weeklyPagesDefault: parseInt(process.env.DEFAULT_WEEKLY_PAGE_GOAL || '200'),
  },

  rateLimit: {
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX || '100'),
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '60000'),
  },

  cookies: {
    domain: process.env.NODE_ENV === 'production'
      ? `.${process.env.NEXT_PUBLIC_DOMAIN || 'coolifyai.com'}`
      : undefined,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' as const : 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
  },

  logging: {
    level: (process.env.NEXT_PUBLIC_LOG_LEVEL || 'info') as 'debug' | 'info' | 'warn' | 'error',
  },
} as const

/**
 * Usage:
 *
 * import { config } from '@/lib/config'
 *
 * const goal = config.goals.weeklyPagesDefault
 * const domain = config.cookies.domain
 */
