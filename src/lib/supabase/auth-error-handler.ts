import { logger } from '../utils/logger'

export interface AuthError {
  message: string
  status?: number
  code?: string
}

/**
 * Handles Supabase authentication errors gracefully
 * Clears invalid sessions and prevents infinite loops
 */
export async function handleAuthError(
  error: AuthError,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  context: string = 'unknown'
): Promise<boolean> {
  const isTokenError = 
    error.message.includes('refresh_token') ||
    error.message.includes('invalid_grant') ||
    error.status === 400 ||
    error.status === 401

  const isNetworkError = 
    error.message.includes('fetch failed') ||
    error.message.includes('NetworkError') ||
    error.status === 0

  logger.error('Authentication error', {
    context,
    error: error.message,
    status: error.status,
    code: error.code,
    isTokenError,
    isNetworkError
  })

  // For network errors, immediately return true to trigger redirect
  if (isNetworkError) {
    logger.info('Network error detected, clearing session immediately', { context })
    return true // Immediately trigger redirect
  }

  // If it's a token error, clear the session to prevent infinite loops
  if (isTokenError) {
    try {
      logger.info('Clearing invalid session', { context })
      await supabase.auth.signOut()
      return true // Session cleared
    } catch (signOutError) {
      logger.error('Failed to clear session', {
        context,
        error: signOutError instanceof Error ? signOutError.message : 'Unknown error'
      })
      // Even if signOut fails, we should return true to indicate we tried to clear the session
      return true
    }
  }

  return false // Session not cleared
}

/**
 * Validates Supabase environment variables
 */
export function validateSupabaseConfig(): { valid: boolean; missing: string[] } {
  const missing: string[] = []
  
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    missing.push('NEXT_PUBLIC_SUPABASE_URL')
  }
  
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }

  if (missing.length > 0) {
    logger.error('Missing Supabase environment variables', { missing })
  }

  return {
    valid: missing.length === 0,
    missing
  }
}

/**
 * Creates a retry mechanism for Supabase operations
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error')
      
      if (attempt === maxRetries) {
        throw lastError
      }

      logger.warn('Operation failed, retrying', {
        attempt,
        maxRetries,
        error: lastError.message
      })

      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay * attempt))
    }
  }

  throw lastError!
}
