/**
 * Structured logging utility
 *
 * Replaces scattered console.log statements with centralized logging
 * - Development: logs to console
 * - Production: only errors logged, ready for external service integration
 */

const isDev = process.env.NODE_ENV === 'development'
const logLevel = (process.env.NEXT_PUBLIC_LOG_LEVEL || 'info') as 'debug' | 'info' | 'warn' | 'error'

const levels = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
}

function shouldLog(level: keyof typeof levels): boolean {
  return levels[level] >= levels[logLevel]
}

export const logger = {
  /**
   * Log informational messages (development only)
   */
  info: (message: string, data?: unknown) => {
    if (isDev && shouldLog('info')) {
      console.info(`[INFO] ${message}`, data !== undefined ? data : '')
    }
    // In production, send to logging service (Datadog, LogRocket, etc.)
  },

  /**
   * Log errors (always logged)
   */
  error: (message: string, error?: unknown) => {
    console.error(`[ERROR] ${message}`, error !== undefined ? error : '')
    // TODO: Send to error tracking service (Sentry, etc.)
  },

  /**
   * Log warnings (development only)
   */
  warn: (message: string, data?: unknown) => {
    if (isDev && shouldLog('warn')) {
      console.warn(`[WARN] ${message}`, data !== undefined ? data : '')
    }
    // In production, send to logging service
  },

  /**
   * Log debug messages (development only, requires NEXT_PUBLIC_LOG_LEVEL=debug)
   */
  debug: (message: string, data?: unknown) => {
    if (isDev && shouldLog('debug')) {
      console.debug(`[DEBUG] ${message}`, data !== undefined ? data : '')
    }
  }
}

/**
 * Usage examples:
 *
 * // Replace: console.log('User logged in:', user)
 * logger.info('User logged in', { userId: user.id, email: user.email })
 *
 * // Replace: console.error('Failed to fetch:', error)
 * logger.error('Failed to fetch data', error)
 *
 * // Replace: console.log('Middleware processing:', path)
 * logger.debug('Middleware processing request', { pathname: path })
 */
